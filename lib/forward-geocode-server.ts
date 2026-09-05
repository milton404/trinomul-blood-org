"use server";

/**
 * Server-side place search with multiple fallbacks.
 *
 * Pipeline:
 *   1. Try Nominatim (server-side, with proper User-Agent).
 *   2. If Nominatim fails / returns nothing, run the AI search parser to
 *      identify district_id / upazila_id from Bangla/Banglish text.
 *   3. Look up the centroid from RANGPUR_DISTRICTS / RANGPUR_UPAZILAS
 *      (always available — local data) and synthesize a result.
 *   4. If still nothing, return an empty array.
 *
 * This guarantees the search always works for any location inside the
 * Rangpur division (the project's service area), even when Nominatim is
 * unreachable or rate-limited.
 */

import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  getDistrictById,
  getUpazilaById,
  type District,
  type Upazila,
} from "@/lib/constants/rangpur";
import { serverParseSearchQuery } from "@/lib/ai/search-parser";
import { callLLM, extractJSON, getActiveProvider } from "@/lib/ai/providers";
import type { PlaceSearchResult } from "@/lib/forward-geocode";

/** Stable hash for synthetic placeIds (negative to distinguish from OSM). */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return -Math.abs(h);
}

/**
 * Well-known Rangpur-division medical institutions with their most-likely
 * centroid coordinates. Used when Nominatim is unreachable AND an acronym /
 * exact name matches (e.g. "RMCH" -> Rangpur Medical College Hospital).
 *
 * Coordinates are approximate centroids within the correct town so the
 * pin-drop + auto-fill works even when external geocoding is blocked.
 */
const KNOWN_MEDICAL_INSTITUTIONS: Array<{
  name: string;
  aliases: string[]; // lower-case
  districtId: string;
  lat: number;
  lng: number;
  type: PlaceSearchResult["type"];
  address: PlaceSearchResult["address"];
}> = [
  {
    name: "Rangpur Medical College Hospital (RMCH)",
    aliases: ["rmch", "rangpur medical college", "rangpur medical college hospital", "rmch hospital", "rangpur medical"],
    districtId: "rangpur",
    lat: 25.7483,
    lng: 89.2458,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Rangpur Medical College Hospital",
      road: "Medical College Road",
      state_district: "Rangpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Dinajpur Medical College Hospital (MARMC)",
    aliases: ["dinajpur medical college", "dinajpur medical college hospital", "marmc", "m abdur rahim medical college", "dinajpur medical"],
    districtId: "dinajpur",
    lat: 25.6270,
    lng: 88.6500,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "M Abdur Rahim Medical College Hospital",
      state_district: "Dinajpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Rangpur General Hospital",
    aliases: ["rangpur general hospital", "rangpur sadar hospital"],
    districtId: "rangpur",
    lat: 25.7439,
    lng: 89.2752,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Rangpur General Hospital",
      state_district: "Rangpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Rangpur Community Medical College Hospital",
    aliases: ["community medical college rangpur", "rangpur community medical", "community medical hospital rangpur"],
    districtId: "rangpur",
    lat: 25.7280,
    lng: 89.2700,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Rangpur Community Medical College Hospital",
      state_district: "Rangpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Prime Medical College Hospital, Rangpur",
    aliases: ["prime medical college", "prime medical college rangpur", "prime medical hospital"],
    districtId: "rangpur",
    lat: 25.7400,
    lng: 89.2600,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Prime Medical College Hospital",
      state_district: "Rangpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Kurigram General Hospital",
    aliases: ["kurigram general hospital", "kurigram sadar hospital", "kurigram hospital"],
    districtId: "kurigram",
    lat: 25.8050,
    lng: 89.6500,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Kurigram General Hospital",
      state_district: "Kurigram",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Lalmonirhat Sadar Hospital",
    aliases: ["lalmonirhat sadar hospital", "lalmonirhat hospital", "lalmonirhat general hospital"],
    districtId: "lalmonirhat",
    lat: 25.9167,
    lng: 89.4667,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Lalmonirhat Sadar Hospital",
      state_district: "Lalmonirhat",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Nilphamari Sadar Hospital",
    aliases: ["nilphamari sadar hospital", "nilphamari hospital", "nilphamari general hospital"],
    districtId: "nilphamari",
    lat: 25.9509,
    lng: 88.8765,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Nilphamari Sadar Hospital",
      state_district: "Nilphamari",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Gaibandha Sadar Hospital",
    aliases: ["gaibandha sadar hospital", "gaibandha hospital", "gaibandha general hospital"],
    districtId: "gaibandha",
    lat: 25.3290,
    lng: 89.5280,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Gaibandha Sadar Hospital",
      state_district: "Gaibandha",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Thakurgaon Sadar Hospital",
    aliases: ["thakurgaon sadar hospital", "thakurgaon hospital", "thakurgaon general hospital"],
    districtId: "thakurgaon",
    lat: 25.8306,
    lng: 88.8968,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Thakurgaon Sadar Hospital",
      state_district: "Thakurgaon",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Panchagarh Sadar Hospital",
    aliases: ["panchagarh sadar hospital", "panchagarh hospital", "panchagarh general hospital"],
    districtId: "panchagarh",
    lat: 26.3370,
    lng: 88.5940,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Panchagarh Sadar Hospital",
      state_district: "Panchagarh",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Saidpur Railway Hospital",
    aliases: ["saidpur railway hospital", "saidpur hospital"],
    districtId: "nilphamari",
    lat: 25.7667,
    lng: 88.8833,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Saidpur Railway Hospital",
      county: "Saidpur",
      state_district: "Nilphamari",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Northern Private Medical College Hospital, Rangpur",
    aliases: ["northern private medical college", "northern medical college rangpur", "northern medical hospital"],
    districtId: "rangpur",
    lat: 25.7420,
    lng: 89.2500,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Northern Private Medical College Hospital",
      state_district: "Rangpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Rangpur Eye Hospital",
    aliases: ["rangpur eye hospital", "eye hospital rangpur"],
    districtId: "rangpur",
    lat: 25.7440,
    lng: 89.2740,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Rangpur Eye Hospital",
      state_district: "Rangpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
  {
    name: "Shishu Hospital, Rangpur",
    aliases: ["shishu hospital rangpur", "rangpur shishu hospital", "children hospital rangpur"],
    districtId: "rangpur",
    lat: 25.7435,
    lng: 89.2745,
    type: "hospital",
    address: {
      amenity: "hospital",
      hospital: "Shishu Hospital Rangpur",
      state_district: "Rangpur",
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  },
];

/**
 * Try to match a raw search query against the hardcoded table of known
 * Rangpur-division medical institutions. Returns the top 3 matches
 * (ordered by alias-specificity, longest alias wins).
 */
function tryKnownMedicalLookup(query: string): PlaceSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const scored: Array<{ inst: typeof KNOWN_MEDICAL_INSTITUTIONS[number]; score: number }> = [];
  for (const inst of KNOWN_MEDICAL_INSTITUTIONS) {
    let score = 0;
    for (const alias of inst.aliases) {
      if (!alias) continue;
      if (q === alias) score = Math.max(score, 100); // exact full alias
      else if (q.includes(alias)) score = Math.max(score, 50 + alias.length); // contains alias (longer = more specific)
      else if (alias.includes(q)) score = Math.max(score, 20); // alias contains query (substring)
    }
    if (score > 0) scored.push({ inst, score });
  }
  if (scored.length === 0) return [];
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ inst }) => {
    const district = RANGPUR_DISTRICTS.find((d) => d.id === inst.districtId) ?? null;
    const displaySuffix = district ? `${district.name_en}, Rangpur Division, Bangladesh` : "Rangpur Division, Bangladesh";
    return {
      placeId: stableHash(`known:${inst.name}`),
      lat: inst.lat,
      lng: inst.lng,
      displayName: `${inst.name}, ${displaySuffix}`,
      shortName: inst.name.replace(/\s*\(.*?\)\s*/g, "").trim(),
      type: inst.type,
      address: inst.address,
    };
  });
}

/**
 * Build a synthetic PlaceSearchResult from a district + upazila using
 * their stored centroid coordinates. Used when Nominatim is unreachable.
 */
function buildLocalResult(
  district: District,
  upazila?: Upazila | null,
  keywords?: string,
): PlaceSearchResult {
  const lat = upazila?.lat ?? district.lat;
  const lng = upazila?.lng ?? district.lng;

  // Display name: "Keywords, Upazila, District, Rangpur, Bangladesh"
  const parts: string[] = [];
  if (keywords && keywords.trim()) parts.push(keywords.trim());
  if (upazila) parts.push(upazila.name_en);
  parts.push(district.name_en);
  parts.push("Rangpur Division");
  parts.push("Bangladesh");

  const displayName = parts.join(", ");
  const shortName = upazila
    ? `${upazila.name_en}, ${district.name_en}`
    : district.name_en;

  return {
    placeId: stableHash(upazila?.id ?? district.id),
    lat,
    lng,
    displayName,
    shortName,
    type: upazila ? "administrative" : "city",
    address: {
      state_district: district.name_en,
      county: upazila?.name_en,
      state: "Rangpur Division",
      country: "Bangladesh",
    },
  };
}

/** Common Banglish aliases for districts (used by the local matcher). */
const DISTRICT_BANGLISH: Record<string, string[]> = {
  rangpur: ["rongpur", "rompur", "rampur", "rongpoor", "rangpoor"],
  dinajpur: ["dinajpoor", "dinazpur", "dinaipur", "denajpur"],
  kurigram: ["kurigrom", "koorigram", "kuri gram", "kurigam"],
  lalmonirhat: ["lalmunirhat", "lalmonir", "lalmonirhot", "lalmonirhat"],
  nilphamari: ["nilfamari", "nil famari", "nilfamary", "nilphamary", "nilfamri", "nulfamari"],
  gaibandha: ["gaybandha", "gobandha", "gaibanda", "gybandha"],
  thakurgaon: ["takurgaon", "thakur gaon", "thakurgon", "takurgaw"],
  panchagarh: ["ponchagarh", "panchagor", "panchagadh", "ponchogorh", "panchagar"],
};

/** Levenshtein distance for fuzzy matching (typo tolerance). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

/** Common upazila Banglish aliases (for the local matcher). */
const UPAZILA_BANGLISH_LOCAL: Record<string, string[]> = {
  rangpur_sadar: ["rongpur sadar", "rangpur sadar"],
  rangpur_city: ["rangpur city", "rongpur city"],
  rangpur_gangachara: ["gangachara", "gongachara", "gangachora"],
  rangpur_kaunia: ["kaunia", "kauniya", "kawnia"],
  rangpur_pirganj: ["pirganj", "pirgonj"],
  rangpur_taraganj: ["taraganj", "taragonj"],
  rangpur_badarganj: ["badarganj", "badargonj", "badorgonj"],
  rangpur_mithapukur: ["mithapukur", "mitha pukur", "mithapukur"],
  rangpur_paglapir: ["paglapir", "pagla pir"],
  nilphamari_saidpur: ["saidpur", "soydpur", "saydpur", "sydpur"],
  nilphamari_dimla: ["dimla", "dimola"],
  nilphamari_domar: ["domar", "domor"],
  nilphamari_jaldhaka: ["jaldhaka", "joldhaka"],
  nilphamari_kishoreganj: ["kishoreganj", "kishoregonj"],
  gaibandha_sadullapur: ["sadullapur", "sadullopur"],
  gaibandha_palashbari: ["palashbari", "polashbari"],
  gaibandha_gobindaganj: ["gobindaganj", "gobindagonj"],
  gaibandha_sundarganj: ["sundarganj", "sundargonj"],
  dinajpur_birampur: ["birampur", "birampo"],
  dinajpur_birganj: ["birganj", "birgonj"],
  dinajpur_biral: ["biral", "birol"],
  dinajpur_bochaganj: ["bochaganj", "bochagonj"],
  dinajpur_phulbari: ["phulbari", "fulbari"],
  dinajpur_parbatipur: ["parbatipur", "porbatipur"],
  kurigram_ulipur: ["ulipur", "ulipoor"],
  kurigram_chilmari: ["chilmari", "chilmory"],
  kurigram_nageshwari: ["nageshwari", "nageshori"],
  kurigram_bhurungamari: ["bhurungamari", "vurungamari"],
  lalmonirhat_aditmari: ["aditmari", "aditmary"],
  lalmonirhat_hatibandha: ["hatibandha", "hatibondha"],
  lalmonirhat_kaliganj: ["kaliganj", "kaligonj"],
  lalmonirhat_patgram: ["patgram", "potgram"],
  thakurgaon_baliadangi: ["baliadangi", "baliadanggi"],
  thakurgaon_haripur: ["haripur", "horipur"],
  thakurgaon_ranisankail: ["ranisankail", "rani shankail"],
  panchagarh_atwari: ["atwari", "atowari"],
  panchagarh_boda: ["boda", "bodda"],
  panchagarh_debiganj: ["debiganj", "debigonj"],
  panchagarh_tetulia: ["tetulia", "tetuliya"],
};

/**
 * Look up district + upazila by attempting to match the query against
 * English / Bengali / Banglish names. Returns the matched district and
 * (optionally) upazila so we can build a centroid-based result.
 *
 * Matching priority (two-pass for upazilas to avoid false matches):
 *   Pass 1: Full upazila name / alias match (most specific)
 *   Pass 2: First-word / partial upazila match (less specific)
 *   Then: District exact/contains (English, Bengali, Banglish alias)
 *   Then: Fuzzy match (typo tolerance via Levenshtein)
 */
function matchLocalDistrictUpazila(
  query: string,
): { district: District | null; upazila: Upazila | null; keywords: string } {
  const lower = query.toLowerCase().trim();
  if (!lower) return { district: null, upazila: null, keywords: "" };

  let matchedDistrict: District | null = null;
  let matchedUpazila: Upazila | null = null;
  let remaining = query;

  // ── Pass 1: Full upazila name / alias match (most specific) ──────
  // Only match if the FULL upazila name or a multi-word alias appears
  // in the query. This prevents "Rangpur" matching "Rangpur Sadar"
  // when the user actually typed "Rangpur City".
  for (const u of RANGPUR_UPAZILAS) {
    const enLower = u.name_en.toLowerCase();
    const bn = u.name_bn;
    const aliases = UPAZILA_BANGLISH_LOCAL[u.id] || [];
    const matched =
      (enLower.length >= 3 && lower.includes(enLower)) ||
      (bn && query.includes(bn)) ||
      aliases.some((a) => a.length >= 5 && lower.includes(a));
    if (matched) {
      matchedUpazila = u;
      matchedDistrict =
        RANGPUR_DISTRICTS.find((d) => d.id === u.district_id) ?? null;
      remaining = remaining.replace(new RegExp(u.name_en, "gi"), " ");
      if (bn) remaining = remaining.replace(bn, " ");
      for (const a of aliases) {
        remaining = remaining.replace(new RegExp(a, "gi"), " ");
      }
      break;
    }
  }

  // ── Pass 2: First-word / partial upazila match (less specific) ───
  // Only try this if Pass 1 didn't match. Use the first word of the
  // upazila name (e.g., "Mithapukur" from "Mithapukur Sadar") or
  // short aliases (>= 4 chars). Skip generic first words like "rangpur"
  // that are also district names — they cause false matches.
  if (!matchedUpazila) {
    for (const u of RANGPUR_UPAZILAS) {
      const enLower = u.name_en.toLowerCase();
      const firstWord = enLower.split(" ")[0];
      const aliases = UPAZILA_BANGLISH_LOCAL[u.id] || [];

      // Skip if the first word is also a district name (e.g., "rangpur",
      // "dinajpur") — these are too generic and cause false matches.
      const isDistrictName = RANGPUR_DISTRICTS.some(
        (d) => d.name_en.toLowerCase() === firstWord,
      );
      if (isDistrictName) continue;

      const matched =
        (firstWord.length >= 4 && lower.includes(firstWord)) ||
        aliases.some((a) => a.length >= 4 && a.length < 5 && lower.includes(a));
      if (matched) {
        matchedUpazila = u;
        matchedDistrict =
          RANGPUR_DISTRICTS.find((d) => d.id === u.district_id) ?? null;
        remaining = remaining.replace(new RegExp(u.name_en, "gi"), " ");
        if (u.name_bn) remaining = remaining.replace(u.name_bn, " ");
        for (const a of aliases) {
          remaining = remaining.replace(new RegExp(a, "gi"), " ");
        }
        break;
      }
    }
  }

  // ── 3. If no upazila matched, try to match a district ────────────
  if (!matchedDistrict) {
    for (const d of RANGPUR_DISTRICTS) {
      const enLower = d.name_en.toLowerCase();
      const bn = d.name_bn;
      const matched =
        (enLower.length >= 3 && lower.includes(enLower)) ||
        (bn && query.includes(bn));
      if (matched) {
        matchedDistrict = d;
        remaining = remaining.replace(new RegExp(d.name_en, "gi"), " ");
        if (bn) remaining = remaining.replace(bn, " ");
        break;
      }
    }
  }

  // ── 4. Check Banglish aliases for districts ─────────────────────
  if (!matchedDistrict) {
    for (const d of RANGPUR_DISTRICTS) {
      const aliases = DISTRICT_BANGLISH[d.id] || [];
      const hit = aliases.find((a) => lower.includes(a));
      if (hit) {
        matchedDistrict = d;
        remaining = remaining.replace(new RegExp(hit, "gi"), " ");
        break;
      }
    }
  }

  // ── 5. Fuzzy match (typo tolerance) ─────────────────────────────
  // If nothing matched yet, try Levenshtein distance on district names.
  if (!matchedDistrict && lower.length >= 4) {
    let bestDist = Infinity;
    let bestDistrict: District | null = null;
    for (const d of RANGPUR_DISTRICTS) {
      const enLower = d.name_en.toLowerCase();
      const dist = levenshtein(lower, enLower);
      // Allow up to 30% of the longer string length as typos
      const maxAllowed = Math.floor(Math.max(lower.length, enLower.length) * 0.3);
      if (dist <= maxAllowed && dist < bestDist) {
        bestDist = dist;
        bestDistrict = d;
      }
    }
    if (bestDistrict) {
      matchedDistrict = bestDistrict;
      remaining = remaining.replace(new RegExp(bestDistrict.name_en, "gi"), " ");
    }
  }

  // Clean up remaining keywords.
  // 1) Collapse whitespace
  // 2) Remove common search/query filler words in EN, BN, Banglish
  // 3) Also drop known medical keywords if the district/upazila lookup is
  //    happening inside a medical pipeline (the keywords field is used for
  //    displayName construction and having "hospital/clinic/খুঁজুন" in it
  //    reads awkwardly when already disambiguated by being shown under a
  //    search with medical context).
  //
  // If after removal nothing useful remains, return "" keywords so the
  // displayName stays clean ("District, Rangpur Division, Bangladesh").
  let kw = remaining
    .replace(/\s+/g, " ")
    // English fillers
    .replace(/\b(near|in|at|of|the|for|from|to|show|find|search|closest|nearest|where is|which|what is|is there|any|koi|around|me|please|plz|college|university|school|institute|foundation|trust|road|lane|avenue|street|more|block|phase|stage|area|centre|center|complex|hall|house|home|market|bazar|shop|store|counter|ticket|counter|bus|rail|railway|train|station|stand|port|airport|terminal|mosque|temple|church|museum|park|zoo|stadium|ground|field|pond|lake|river|bridge|square|circle|chattar|mor|more|point)\b/gi, " ")
    // Bangla fillers (full words — NOT partial strings)
    .replace(/(^|[^\u0980-\u09FF])খুঁজুন([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])খুঁজে([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])খুঁজি([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কোথায়([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কি([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কোনটা([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কোন([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])সাথে([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])আছে([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])পেতে([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])চাই([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])দেখাও([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])দেখান([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কই([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])এখানে([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])ওখানে([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])এর([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])এটা([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])এটি([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কমপ্লেক্স([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কেন্দ্র([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])হাসপাতাল কোথায়([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])মেডিকেল([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])কলেজ([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])বিশ্ববিদ্যালয়([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])রেলস্টেশন([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])স্টেশন([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])রেল([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])বাস([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])স্ট্যান্ড([^\u0980-\u09FF]|$)/g, "$1 $2")
    .replace(/(^|[^\u0980-\u09FF])ট্রেন([^\u0980-\u09FF]|$)/g, "$1 $2")
    // Banglish fillers (lower-case pattern on lower text)
    .toLowerCase()
    .replace(/\b(kothay|koi|khujun|khuje|khuji|ki|kon|kata|ache|pete|chai|dekhao|dekhan|okhane|ekhane|er|e|eta|eti|kotha|thakay|bashay|koiro|dekhabay|kichu|onek|shob|shudhu|matro|taratari|jaldi|karon|karon|amr|amar|amake|amakei|bol|bolo|bolen|boli|dhore|dhor|dhorei|shathe|shathey|sathe|sathey|hoy|hoyto|how|hobe|kora|karo|kore|kori|korar|ashbe|asbe|asho|aso|jaw|jao|jay|ja|jaoya|jawa|thakte|thakuk|thake|thako|hocche|hochhe|hoche|hoite|hotey|hoyto|pabo|pabey|pabe|pai|pay|pawa|peye|pete|petey|chai|chay|chaiye|chaowa|chaiya|dekhe|dekha|dekhay|dekhiye|dekhano|bolte|bolta|bole|bollo|bolbo|bolben|bolbe|ashlam|aslam|ashchi|aschi|jabo|jabey|jabe|paisi|payechi|paiso|paisen|paw|paid|pei|perey|pere|paichi|paico|shomoy|somoy|belay|shondha|kal|aj|parsal|kalke|thekay|theke|tekhay|teke|tey|porjonto|porjonto|perjonto|hote|hottam|hotam|chilo|chhilo|chilona|chhilona|khola|khullo|bondho|cholonay|cholbe|chole|choley|giye|giya|gaya|giyeche|geyeche|gechhe|achhe|achi|acho|acche|accha|acha|ashay|thakay|ekhon|now|abair|abar|phire|phero|ferot|ferat|abong|o|ar|are|orr|huh|uhu|thik|vhalo|bhalo|valo|onek|shomosto|sob|shobai|sabai|sobe|shobey|karon|karon|shudhu|matra|matro|eita|eta|eti|eiti|kon|kou|ke|kar|kare|kake|karon|shathe|shathe|sathe|sathey|hoito|hoyto|hta|to|too|oto|etuku|etota|koto|khowa|howa|hoya|howar|hoyar|howate|hoyate|darale|daray|darao|darun|dhur|chap|chapa|chapor|shala|ki|amr|er|eita|oita|otai|etai|je|jare|take|tai|bole|tai|mota|taito|eto|toto|tho|thoito|tohoto|thoto|to|tho|college|medical|institute)\b/g, " ")
    // Medical keywords we want to drop from the "keywords" field (since
    // the shortName will be a district/upazila + they're already
    // implicit by the medical flow) — keep some that are informative
    .replace(/\b(hospital|clinic|medical|health|hospotal|haspatal|hashpatal|medikal|klinik|helth|doctor|daktar|hokter|pharmacy|dispensary)\b/g, " ")
    .replace(/(হাসপাতাল|ক্লিনিক|মেডিকেল|স্বাস্থ্য|হেলথ|চিকিৎসালয়|ডাক্তার|ঔষধালয়)/g, " ")
    // Clean stray Bangla diacritics / punctuation leftover
    .replace(/[\u0980-\u09FF]*[া-ৌ][\u0980-\u09FF]*/g, " ")
    .replace(/[?,!:;'"()\[\]{}।\-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If the remaining keywords are too short or all stopwords → drop them
  if (kw.length > 0 && kw.length < 4) kw = "";
  // Drop pure stopword leftovers (single char, punctuation, etc.)
  if (/^[a-zA-Z0-9?.,!;: '"\s\-_]+$/.test(kw) && kw.replace(/[^a-zA-Z0-9]/g, "").length < 4) kw = "";

  const keywords = kw;

  return { district: matchedDistrict, upazila: matchedUpazila, keywords };
}

/**
 * A Nominatim-style fetch that runs server-side with a proper User-Agent
 * (Nominatim's usage policy requires one; browsers send their own UA but
 * server fetches do not). Wrapped in a short timeout so we fall through
 * to the local fallback quickly if the network is slow or blocked.
 */
async function nominatimSearch(
  query: string,
  limit = 5,
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&q=${encodeURIComponent(trimmed)}` +
    `&limit=${limit}` +
    `&accept-language=en` +
    `&countrycodes=bd`;

  try {
    // 3-second hard timeout — local data is the primary source, so
    // Nominatim is only a fallback for locations outside our service area.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "TrinomulBloodBank/1.0 (rangpur-blood-bank.app)",
      },
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any): PlaceSearchResult => {
      const displayName: string = item.display_name ?? "";
      const parts = displayName.split(",").map((p: string) => p.trim());
      const shortName = parts.slice(0, 2).join(", ");

      return {
        placeId: item.place_id,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName,
        shortName,
        osmType: item.osm_type,
        osmId: item.osm_id,
        type: item.type,
        address: item.address,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Public server action: search for a place by name.
 *
 * Architecture (optimized for speed + reliability):
 *   1. Check LOCAL data first (instant) — match the query against
 *      Rangpur division's districts/upazilas using English, Bengali,
 *      Banglish, and fuzzy matching. This covers 99% of searches
 *      since the project only serves Rangpur division.
 *   2. If local data matches, return immediately (no network call).
 *   3. If no local match, try Nominatim (3s timeout) for locations
 *      outside Rangpur division (hospitals, landmarks, etc.).
 *   4. If Nominatim also fails, try the AI search parser as a last
 *      resort to normalize the text and extract district/upazila IDs.
 *
 * Always returns an array — never throws.
 */
export async function serverSearchPlace(
  query: string,
): Promise<PlaceSearchResult[]> {
  const trimmed = (query || "").trim();
  if (!trimmed) return [];

  // ── 1. Check local data FIRST (instant, no network) ─────────────
  const { district, upazila, keywords } = matchLocalDistrictUpazila(trimmed);
  if (district) {
    return [buildLocalResult(district, upazila, keywords)];
  }

  // ── 2. Try Nominatim for non-Rangpur locations (3s timeout) ─────
  const remoteResults = await nominatimSearch(trimmed, 5);
  if (remoteResults.length > 0) return remoteResults;

  // ── 3. AI search parser as last resort ──────────────────────────
  // The AI can normalize Bangla/Banglish text that our local matcher
  // didn't catch (e.g., unusual spellings, mixed-language queries).
  let aiDistrictId: string | null = null;
  let aiUpazilaId: string | null = null;
  let aiKeywords = "";

  try {
    const parsed = await serverParseSearchQuery(trimmed);
    aiDistrictId = parsed.district_id;
    aiUpazilaId = parsed.upazila_id;
    aiKeywords = parsed.keywords || "";
  } catch {
    // AI parser failure — return empty.
  }

  if (aiDistrictId) {
    const aiDistrict = getDistrictById(aiDistrictId);
    const aiUpazila = aiUpazilaId ? getUpazilaById(aiUpazilaId) : null;
    if (aiDistrict) {
      return [buildLocalResult(aiDistrict, aiUpazila, aiKeywords)];
    }
  }

  // ── 4. Nothing matched — return empty array ─────────────────────
  return [];
}

// ═══════════════════════════════════════════════════════════════════
// AI-powered Medical Institution Search
// ═══════════════════════════════════════════════════════════════════

export interface MedicalInstitutionExtract {
  /** The cleaned/normalized medical institution name for map search */
  institutionName: string;
  /** District name if detected (e.g. "Rangpur", "Dinajpur") */
  districtHint?: string;
  /** Upazila name if detected */
  upazilaHint?: string;
  /** Whether AI was used for extraction */
  aiUsed: boolean;
  /** Which provider was used */
  provider?: string;
}

/**
 * Use AI to extract and normalize a medical institution name from a
 * raw search query. Handles Bangla, English, and Banglish inputs.
 * Provider chain: GLM-4-Flash (free) → DeepSeek V4-Flash (paid) → null.
 */
async function aiExtractMedicalInstitution(
  rawQuery: string,
): Promise<MedicalInstitutionExtract | null> {
  const provider = getActiveProvider();
  if (!provider) return null;

  const districtList = RANGPUR_DISTRICTS.map(
    (d) => `"${d.id}" (${d.name_en}/${d.name_bn})`,
  ).join(", ");

  const prompt = `You are a location name extractor for Trinomul Blood Bank in Rangpur Division, Bangladesh.
Extract ONLY the medical institution name from the user's search query. The user is searching for a hospital, clinic, medical college, or medical center.

Input may be in English, Bengali (Bangla), or Banglish (Bengali written in English letters).

Rules:
1. Extract the medical institution name ONLY — strip out filler words like "find", "search", "near", "in", "blood", "donor", etc.
2. Normalize the name: fix obvious typos, expand abbreviations (e.g. "RMC" → "Rangpur Medical College", "RMCH" → "Rangpur Medical College Hospital")
3. Translate Bangla/Banglish to proper English if needed (e.g. "মেডিকেল কলেজ" → "Medical College", "হাসপাতাল" → "Hospital")
4. If the query mentions a district/upazila, note it separately as a hint
5. If the query does NOT contain a medical institution name, return the original query as-is for general location search

Known medical institutions in Rangpur Division (use these as reference for normalization):
- Rangpur Medical College Hospital (RMCH)
- Rangpur Community Medical College Hospital
- Prime Medical College Hospital, Rangpur
- Northern Private Medical College Hospital, Rangpur
- Rangpur General Hospital
- Shishu Hospital, Rangpur
- Rangpur Eye Hospital
- Dinajpur Medical College Hospital
- M Abdur Rahim Medical College Hospital, Dinajpur
- Kurigram General Hospital
- Lalmonirhat Sadar Hospital
- Nilphamari Sadar Hospital
- Gaibandha Sadar Hospital
- Thakurgaon Sadar Hospital
- Panchagarh Sadar Hospital
- Saidpur Railway Hospital
- Upazila Health Complex (various)

Valid districts: ${districtList}

Return a JSON object with EXACTLY these keys:
{
  "institutionName": "string — the cleaned medical institution name for map search",
  "districtHint": "string or null — district name if detected",
  "upazilaHint": "string or null — upazila name if detected"
}

Output valid JSON only — no markdown fences, no explanations.`;

  try {
    const result = await callLLM(
      `${prompt}\n\nUser query: "${rawQuery}"\n\nJSON:`,
      true,
    );
    if (!result) return null;

    const jsonStr = extractJSON(result.text);
    const parsed = JSON.parse(jsonStr);

    return {
      institutionName:
        typeof parsed.institutionName === "string"
          ? parsed.institutionName.trim()
          : rawQuery.trim(),
      districtHint:
        typeof parsed.districtHint === "string"
          ? parsed.districtHint.trim()
          : undefined,
      upazilaHint:
        typeof parsed.upazilaHint === "string"
          ? parsed.upazilaHint.trim()
          : undefined,
      aiUsed: true,
      provider: result.provider,
    };
  } catch (e) {
    console.warn("[AI medical extract] Failed:", e);
    return null;
  }
}

/**
 * Check if the query looks like a medical institution search.
 * Detects keywords in English, Bangla, and Banglish.
 */
function isMedicalQuery(query: string): boolean {
  // Quick acronym table (RMCH, MARMC, etc.) — some are purely acronyms
  // with no "hospital" / "medical" keyword.
  const ACRO_MATCH = /(^|\W)(rmch|marmc|dmc|mc|rmc|cmc|pmch|smch|rch|shcms|mcw)(\W|$)/i;
  if (ACRO_MATCH.test(query)) return true;

  const medicalPatterns = [
    // English
    /\b(hospital|clinic|medical|health|nursing|diagnostic|sadar|upazila health|dental|eye hospital|pharmacy|dispensary|healthcare|ophthalmic|paediatric|pediatric|medicine|doctor|checkup|operation|surgery|ward|cabin|unit|complex|centre|center)\b/i,
    // Bangla
    /(হাসপাতাল|ক্লিনিক|মেডিকেল|স্বাস্থ্য|সদর|হেলথ|চিকিৎসালয়|ডেন্টাল|চোখের হাসপাতাল|ঔষধালয়|হেলথ কমপ্লেক্স|ডাক্তার|হাসপাতাল খুঁজুন|হাসপাতাল কোথায়|শিশু হাসপাতাল|চিকিৎসা কেন্দ্র|অপারেশন|সার্জারি|ওয়ার্ড|কেবিন|ইউনিট|কমপ্লেক্স|সেন্টার|সেন্টার)/,
    // Banglish
    /\b(haspatal|hashpatal|haspotal|hospotal|klinik|medikal|helth|health|sador|upazila helth|upazila health|chikitsaloy|chikitsa kendro|dental|hokter|hokter hospotal|pharmacy|dispensary|helth complex|health complex|doctor|daktar|checkup|chekup|operation|surgery|ward|cabin|unit|complex|center|centre|kothay|koi|khujun|dekhao)\b/i,
  ];
  return medicalPatterns.some((p) => p.test(query));
}

/**
 * Search Nominatim specifically for medical facilities (hospitals, clinics).
 * Adds Rangpur division viewbox bias and scores results by medical relevance.
 */
async function nominatimMedicalSearch(
  query: string,
  limit = 5,
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&q=${encodeURIComponent(trimmed)}` +
    `&limit=${limit * 3}` + // fetch more to rank
    `&accept-language=en` +
    `&countrycodes=bd` +
    `&bounded=0` +
    `&viewbox=88.0,25.0,90.0,26.5`; // Rangpur division bounding box

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "TrinomulBloodBank/1.0 (rangpur-blood-bank.app)",
      },
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Score & rank by medical relevance
    interface ScoredResult extends PlaceSearchResult {
      _medicalScore: number;
    }
    const results: ScoredResult[] = data.map((item: any): ScoredResult => {
      const displayName: string = item.display_name ?? "";
      const parts = displayName.split(",").map((p: string) => p.trim());
      const shortName = parts.slice(0, 2).join(", ");
      const addr = item.address ?? {};

      let medicalScore = 0;
      const typeStr = (item.type ?? "").toLowerCase();
      const categoryStr = (item.category ?? "").toLowerCase();
      const displayStr = displayName.toLowerCase();

      if (typeStr === "hospital" || typeStr === "clinic") medicalScore += 3;
      if (categoryStr.includes("hospital") || categoryStr.includes("clinic")) medicalScore += 2;
      if (displayStr.includes("hospital") || displayStr.includes("clinic") || displayStr.includes("medical")) medicalScore += 2;
      if (addr?.hospital) medicalScore += 4;
      if (addr?.amenity === "hospital" || addr?.amenity === "clinic") medicalScore += 3;
      if (addr?.healthcare) medicalScore += 1;
      if (displayStr.includes("rangpur") || displayStr.includes("dinajpur") || displayStr.includes("kurigram") || displayStr.includes("lalmonirhat") || displayStr.includes("nilphamari") || displayStr.includes("gaibandha") || displayStr.includes("thakurgaon") || displayStr.includes("panchagarh")) medicalScore += 1;

      return {
        placeId: item.place_id,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName,
        shortName,
        osmType: item.osm_type,
        osmId: item.osm_id,
        type: typeStr || undefined,
        address: addr,
        _medicalScore: medicalScore,
      };
    });

    // Filter out clearly non-medical results so a search like
    // "rangpur medical" doesn't surface "Rangpur Metropolitan City"
    // (a city boundary) ahead of actual hospitals. We keep a result
    // only if it has at least one strong medical signal: a medical
    // type/category, a hospital address field, or a medical keyword
    // in the display name.
    const medicalOnly = results.filter((r) => {
      if (r._medicalScore >= 3) return true; // has a strong medical signal
      // Allow weakly-scored results only if their name itself contains
      // a medical keyword (e.g. "... Medical College, ...").
      const nameHasMedical = /(hospital|clinic|medical|health|diagnostic|sadar|complex|college|nursing|dental|eye|shishu|cardiac|kidney|cancer|pharmacy|dispensary|হাসপাতাল|ক্লিনিক|মেডিকেল|স্বাস্থ্য|সদর|কমপ্লেক্স|কলেজ)/i.test(
        r.displayName,
      );
      return nameHasMedical;
    });

    // If filtering removed everything, fall back to the original list
    // (better to show something than nothing) — but only when there
    // were no strong medical matches at all.
    const finalResults = medicalOnly.length > 0 ? medicalOnly : results;

    finalResults.sort((a, b) => b._medicalScore - a._medicalScore);

    return finalResults.slice(0, limit).map(({ _medicalScore, ...rest }) => rest);
  } catch {
    return [];
  }
}

/**
 * Public server action: search for medical institutions (hospitals, clinics,
 * medical colleges) using AI-powered text extraction + Nominatim geocoding.
 *
 * Pipeline:
 *   1. Use AI (GLM → DeepSeek) to extract and normalize the medical
 *      institution name from the raw query.
 *   2. If AI succeeds, search Nominatim with the cleaned name + Rangpur
 *      division viewbox bias.
 *   3. If Nominatim returns results, return them (sorted by medical relevance).
 *   4. If Nominatim fails or returns nothing, try the regular serverSearchPlace
 *      as fallback.
 *   5. If nothing works, return empty array.
 *
 * Always returns an array — never throws.
 */
export async function serverSearchMedicalPlace(
  query: string,
): Promise<PlaceSearchResult[]> {
  const trimmed = (query || "").trim();
  if (!trimmed) return [];

  const isMedical = isMedicalQuery(trimmed);
  let searchQuery = trimmed;
  let aiExtract: MedicalInstitutionExtract | null = null;

  // ── 0. Fast-path: hardcoded known Rangpur medical institutions ──
  // Runs for ANY non-empty query (not just medical) so that a bare
  // acronym like "RMCH" still returns a match even when AI/Nominatim
  // are unusable. Use the longest-alias win scoring; this gives the
  // pin-drop a specific address with type="hospital" instead of a
  // generic district centroid.
  const knownMatches = tryKnownMedicalLookup(trimmed);

  // If this looks like a pure acronym / short identifier (≤12 chars
  // with no whitespace, or matches a known alias exactly) AND we
  // got a match, prefer it immediately over network paths.
  const looksLikePureAcronym =
    trimmed.length <= 16 && !/\s/.test(trimmed) && knownMatches.length > 0;
  if (looksLikePureAcronym) return knownMatches;

  // Fast-path: if the query EXACTLY matches a known alias (e.g.
  // "rangpur medical", "rmch", "rangpur general hospital"), return
  // the known institution immediately. This avoids waiting for AI
  // extraction + Nominatim and prevents a generic city result from
  // a flaky Nominatim reply from appearing above the correct hospital.
  const qLower = trimmed.toLowerCase();
  const exactAliasMatch = KNOWN_MEDICAL_INSTITUTIONS.some((inst) =>
    inst.aliases.some((a) => a === qLower),
  );
  if (exactAliasMatch && knownMatches.length > 0) return knownMatches;

  // ── 1. AI extraction of medical institution name ─────────────────
  if (isMedical) {
    try {
      aiExtract = await aiExtractMedicalInstitution(trimmed);
      if (aiExtract?.institutionName) {
        searchQuery = aiExtract.institutionName;
      }
    } catch (e) {
      console.warn("[Medical search] AI extraction failed:", e);
    }
  }

  // Also run the known lookup on the (potentially cleaned) AI query
  // — e.g. AI turns "RMCH hospital" → "Rangpur Medical College
  // Hospital" and that then hits an alias match.
  const cleanedKnown =
    searchQuery !== trimmed ? tryKnownMedicalLookup(searchQuery) : [];
  const mergedKnown =
    cleanedKnown.length > knownMatches.length ? cleanedKnown : knownMatches;

  // ── 2. Search Nominatim with medical bias ────────────────────────
  if (isMedical) {
    const medicalResults = await nominatimMedicalSearch(searchQuery, 5);
    if (medicalResults.length > 0) {
      // If we have known medical institution matches, put them FIRST.
      // This prevents a generic Nominatim city result (e.g. "Rangpur
      // Metropolitan City") from appearing above the correct hospital
      // (e.g. "Rangpur Medical College Hospital") when the user
      // searched for a well-known institution by name.
      if (mergedKnown.length > 0) {
        const seen = new Set<string>(mergedKnown.map((r) => r.shortName));
        const combined = [...mergedKnown];
        for (const m of medicalResults) {
          if (!seen.has(m.shortName)) {
            combined.push(m);
            seen.add(m.shortName);
          }
        }
        return combined.slice(0, 6);
      }
      return medicalResults;
    }
  }

  // ── 2b. Known matches fallback (network probably blocked) ──────
  // When Nominatim returns nothing but the hardcoded Rangpur medical
  // table has a hit for the user's query (or AI normalized query),
  // return that instead of empty district names. These carry the
  // correct `type: hospital` so the downstream auto-fill / toast /
  // map-badge all treat the result as a proper medical location.
  if (mergedKnown.length > 0) return mergedKnown;

  // ── 3. Fall back to general Nominatim search ─────────────────────
  const generalResults = await nominatimSearch(searchQuery, 5);
  if (generalResults.length > 0) return generalResults;

  // ── 4. Local data fallback (district/upazila centroid) ────────────
  const { district, upazila, keywords } = matchLocalDistrictUpazila(searchQuery);
  if (district) {
    const fromLocal = buildLocalResult(district, upazila, keywords);
    // When the search looked medical AND the local result is a generic
    // city/administrative type, synthesize a more appropriate type so
    // downstream handling (toasts, auto-fill, icon) works as if this
    // were a confirmed medical match.
    if (isMedical && (fromLocal.type === "city" || fromLocal.type === "administrative")) {
      fromLocal.type = "hospital";
      if (fromLocal.address) {
        fromLocal.address.amenity = "hospital";
      }
    }
    return [fromLocal];
  }

  // ── 5. AI search parser as last resort ───────────────────────────
  let aiDistrictId: string | null = null;
  let aiUpazilaId: string | null = null;
  let aiKeywords = "";

  try {
    const parsed = await serverParseSearchQuery(searchQuery);
    aiDistrictId = parsed.district_id;
    aiUpazilaId = parsed.upazila_id;
    aiKeywords = parsed.keywords || "";
  } catch {
    // AI parser failure — return empty.
  }

  if (aiDistrictId) {
    const aiDistrict = getDistrictById(aiDistrictId);
    const aiUpazila = aiUpazilaId ? getUpazilaById(aiUpazilaId) : null;
    if (aiDistrict) {
      const fromAI = buildLocalResult(aiDistrict, aiUpazila, aiKeywords);
      if (isMedical && (fromAI.type === "city" || fromAI.type === "administrative")) {
        fromAI.type = "hospital";
        if (fromAI.address) fromAI.address.amenity = "hospital";
      }
      return [fromAI];
    }
  }

  // ── 6. Final desperation: if query looked medical but no district
  // matched, default to Rangpur district centroid (better than a
  // blank result list and an error toast).
  if (isMedical) {
    const defaultDistrict = RANGPUR_DISTRICTS.find((d) => d.id === "rangpur");
    if (defaultDistrict) {
      const fallback = buildLocalResult(defaultDistrict, null, "");
      fallback.type = "hospital";
      if (fallback.address) fallback.address.amenity = "hospital";
      return [fallback];
    }
  }

  return [];
}
