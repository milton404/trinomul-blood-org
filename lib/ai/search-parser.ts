"use server";

import { callLLM, extractJSON, getActiveProvider } from "./providers";
import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  type District,
  type Upazila,
} from "@/lib/constants/rangpur";

// ── Types ───────────────────────────────────────────────────────────

export interface ParsedSearchQuery {
  blood_group: string | null;     // e.g. "A+", "O-"
  district_id: string | null;     // e.g. "rangpur"
  upazila_id: string | null;      // e.g. "rangpur_sadar"
  keywords: string;               // remaining text (name / phone / hospital)
  confidence: "high" | "medium" | "low";
  ai_used: boolean;               // true if LLM successfully parsed
}

// ── Blood group normalization ───────────────────────────────────────

const BLOOD_GROUP_MAP: Record<string, string> = {
  "a+": "A+", "a positive": "A+", "a pos": "A+", "a plus": "A+", "এ পজিটিভ": "A+", "এ+": "A+", "এ পজ": "A+",
  "a-": "A-", "a negative": "A-", "a neg": "A-", "a minus": "A-", "এ নেগেটিভ": "A-", "এ-": "A-", "এ নেগ": "A-",
  "b+": "B+", "b positive": "B+", "b pos": "B+", "b plus": "B+", "বি পজিটিভ": "B+", "বি+": "B+", "বি পজ": "B+",
  "b-": "B-", "b negative": "B-", "b neg": "B-", "b minus": "B-", "বি নেগেটিভ": "B-", "বি-": "B-", "বি নেগ": "B-",
  "ab+": "AB+", "ab positive": "AB+", "ab pos": "AB+", "ab plus": "AB+", "এবি পজিটিভ": "AB+", "এবি+": "AB+", "এবি পজ": "AB+",
  "ab-": "AB-", "ab negative": "AB-", "ab neg": "AB-", "ab minus": "AB-", "এবি নেগেটিভ": "AB-", "এবি-": "AB-", "এবি নেগ": "AB-",
  "o+": "O+", "o positive": "O+", "o pos": "O+", "o plus": "O+", "ও পজিটিভ": "O+", "ও+": "O+", "ও পজ": "O+",
  "o-": "O-", "o negative": "O-", "o neg": "O-", "o minus": "O-", "ও নেগেটিভ": "O-", "ও-": "O-", "ও নেগ": "O-",
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function normalizeBloodGroup(input: string): string | null {
  const cleaned = input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  // direct map
  if (BLOOD_GROUP_MAP[cleaned]) return BLOOD_GROUP_MAP[cleaned];
  // spaced variant like "a +", "o -"
  const noSpace = cleaned.replace(/\s+/g, "");
  if (BLOOD_GROUP_MAP[noSpace]) return BLOOD_GROUP_MAP[noSpace];
  // check if any blood group appears in text — flexible regex
  for (const bg of BLOOD_GROUPS) {
    const letterPart = bg[0]; // A, B, O, or AB
    const signPart = bg.slice(1); // + or -
    // match "a+", "a +", "a positive", "a pos" etc. with word boundary
    const pattern = new RegExp(
      `\\b${letterPart.replace("AB", "AB|Ab|ab")}\\s*[+${signPart === "+" ? "" : ""}]`,
      "i",
    );
    // Simpler: just look for the blood group pattern in text
    const simplePattern = new RegExp(
      `\\b${letterPart}\\s*[${signPart === "+" ? "+" : "\\-"}]`,
      "i",
    );
    if (simplePattern.test(input) || pattern.test(input)) return bg;
  }
  // Also check for "positive"/"negative"/"plus"/"minus" spelled out
  const posNegMatch = input.match(/\b([ABOab]+)\s*(positive|negative|pos|neg|plus|minus)\b/i);
  if (posNegMatch) {
    const letter = posNegMatch[1].toUpperCase();
    const isPos = /pos|plus/i.test(posNegMatch[2]);
    const bg = `${letter}${isPos ? "+" : "-"}`;
    if (BLOOD_GROUPS.includes(bg)) return bg;
  }
  return null;
}

// ── Banglish / phonetic aliases ────────────────────────────────────
// Maps common Banglish spellings to district/upazila IDs

const DISTRICT_BANGLISH: Record<string, string[]> = {
  rangpur: ["rongpur", "rangpur", "rampur", "rompur"],
  dinajpur: ["dinajpur", "dinajpoor", "dinazpur"],
  kurigram: ["kurigram", "kuri gram", "kurigrom", "koorigram"],
  lalmonirhat: ["lalmonirhat", "lalmonir hat", "lalmunirhat", "lalmonir"],
  nilphamari: ["nilphamari", "nilfamari", "nilphamary", "nil famari"],
  gaibandha: ["gaibandha", "gaybandha", "gobandha"],
  thakurgaon: ["thakurgaon", "thakur gaon", "takurgaon"],
  panchagarh: ["panchagarh", "panchagor", "ponchagarh", "panchagadh"],
};

const UPAZILA_BANGLISH: Record<string, string[]> = {
  rangpur_sadar: ["sadar", "rongpur sadar", "rangpur sadar"],
  rangpur_gangachara: ["gangachara", "gongachara", "gangachora"],
  rangpur_kaunia: ["kaunia", "kauniya", "kawnia"],
  rangpur_pirganj: ["pirganj", "pirgonj", "pirgang"],
  rangpur_taraganj: ["taraganj", "taragonj"],
  rangpur_badarganj: ["badarganj", "badargonj"],
  rangpur_mithapukur: ["mithapukur", "mitha pukur", "mithapukur", "mithapukur"],
  rangpur_city: ["rangpur city", "rongpur city", "city"],
  rangpur_paglapir: ["paglapir", "pagla pir"],
  dinajpur_sadar: ["dinajpur sadar", "sadar"],
  kurigram_sadar: ["kurigram sadar", "kuri gram sadar", "sadar"],
  lalmonirhat_sadar: ["lalmonirhat sadar", "sadar"],
  nilphamari_sadar: ["nilphamari sadar", "sadar"],
  gaibandha_sadar: ["gaibandha sadar", "sadar"],
  thakurgaon_sadar: ["thakurgaon sadar", "sadar"],
  panchagarh_sadar: ["panchagarh sadar", "sadar"],
  nilphamari_saidpur: ["saidpur", "soydpur", "saydpur"],
  nilphamari_dimla: ["dimla", "dimola"],
  nilphamari_domar: ["domar", "domor"],
  nilphamari_jaldhaka: ["jaldhaka", "joldhaka"],
  nilphamari_kishoreganj: ["kishoreganj", "kishoregonj"],
  gaibandha_sadullapur: ["sadullapur", "sadullapur", "sadullopur"],
  gaibandha_palashbari: ["palashbari", "polashbari", "palash bari"],
  gaibandha_gobindaganj: ["gobindaganj", "gobindagonj", "gobinda ganj"],
  gaibandha_sundarganj: ["sundarganj", "sundargonj"],
  gaibandha_fulchhari: ["fulchhari", "fulchhori", "phulchhari"],
  gaibandha_shaghata: ["shaghata", "saghata", "shaghta"],
  dinajpur_birampur: ["birampur", "birampo"],
  dinajpur_birganj: ["birganj", "birgonj"],
  dinajpur_biral: ["biral", "birol"],
  dinajpur_bochaganj: ["bochaganj", "bochagonj", "bocha"],
  dinajpur_chirirbandar: ["chirirbandar", "chirirbandor"],
  dinajpur_phulbari: ["phulbari", "phul bari", "fulbari"],
  dinajpur_ghoraghat: ["ghoraghat", "ghoraghot"],
  dinajpur_hakimpur: ["hakimpur", "hokimpur"],
  dinajpur_kaharole: ["kaharole", "kaharol"],
  dinajpur_khansama: ["khansama", "khansama"],
  dinajpur_nawabganj: ["nawabganj", "nobabganj"],
  dinajpur_parbatipur: ["parbatipur", "porbatipur"],
  kurigram_ulipur: ["ulipur", "ulipoor"],
  kurigram_chilmari: ["chilmari", "chilmory"],
  kurigram_rajarhat: ["rajarhat", "rajarhot"],
  kurigram_nageshwari: ["nageshwari", "nageshori", "nagesshori"],
  kurigram_bhurungamari: ["bhurungamari", "vurungamari", "bhurungamary"],
  kurigram_rowmari: ["rowmari", "roumari", "romari"],
  kurigram_char_rajibpur: ["char rajibpur", "char rajib"],
  lalmonirhat_aditmari: ["aditmari", "aditmary"],
  lalmonirhat_hatibandha: ["hatibandha", "hatibondha"],
  lalmonirhat_kaliganj: ["kaliganj", "kaligonj"],
  lalmonirhat_patgram: ["patgram", "potgram"],
  thakurgaon_baliadangi: ["baliadangi", "baliadanggi"],
  thakurgaon_haripur: ["haripur", "horipur"],
  thakurgaon_pirganj: ["pirganj", "pirgonj"],
  thakurgaon_ranisankail: ["ranisankail", "rani shankail", "ranisonkol"],
  panchagarh_atwari: ["atwari", "atowari"],
  panchagarh_boda: ["boda", "bodda"],
  panchagarh_debiganj: ["debiganj", "debigonj"],
  panchagarh_tetulia: ["tetulia", "tetuliya", "tetul"],
};

// ── Levenshtein distance for fuzzy matching ─────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
  ]);
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

/**
 * Fuzzy match: returns true if `input` is "close enough" to `target`.
 * Allows 1 typo for words ≤5 chars, 2 typos for longer words.
 */
function fuzzyMatch(input: string, target: string): boolean {
  const a = input.toLowerCase().trim();
  const b = target.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Allow typos based on word length
  const maxDist = b.length <= 5 ? 1 : 2;
  return levenshtein(a, b) <= maxDist;
}

// ── District / Upazila matching (English + Bangla + Banglish + fuzzy) ──

function findDistrict(input: string): District | null {
  if (!input || !input.trim()) return null;
  const lower = input.toLowerCase().trim();

  // 1. Exact ID match
  const byId = RANGPUR_DISTRICTS.find((d) => d.id === lower);
  if (byId) return byId;

  // 2. Exact English name
  const byEn = RANGPUR_DISTRICTS.find((d) => d.name_en.toLowerCase() === lower);
  if (byEn) return byEn;

  // 3. Bengali name exact or contains (guard against empty string matching)
  const trimmed = input.trim();
  if (trimmed) {
    const byBn = RANGPUR_DISTRICTS.find(
      (d) => trimmed.includes(d.name_bn) || d.name_bn.includes(trimmed),
    );
    if (byBn) return byBn;
  }

  // 4. Banglish / phonetic aliases
  for (const d of RANGPUR_DISTRICTS) {
    const aliases = DISTRICT_BANGLISH[d.id] || [];
    if (aliases.some((alias) => lower === alias || lower.includes(alias))) {
      return d;
    }
  }

  // 5. Starts-with English name
  const startsWith = RANGPUR_DISTRICTS.find((d) =>
    d.name_en.toLowerCase().startsWith(lower) || lower.startsWith(d.name_en.toLowerCase()),
  );
  if (startsWith && lower.length >= 3) return startsWith;

  // 6. Contains (bidirectional)
  const contains = RANGPUR_DISTRICTS.find(
    (d) => lower.includes(d.name_en.toLowerCase()) || d.name_en.toLowerCase().includes(lower),
  );
  if (contains && lower.length >= 3) return contains;

  // 7. Fuzzy match (typo tolerance) — only for queries >= 4 chars
  if (lower.length >= 4) {
    const fuzzy = RANGPUR_DISTRICTS.find((d) => fuzzyMatch(lower, d.name_en));
    if (fuzzy) return fuzzy;
  }

  return null;
}

function findUpazila(
  input: string,
  districtId?: string | null,
): Upazila | null {
  if (!input || !input.trim()) return null;
  const lower = input.toLowerCase().trim();
  const pool = districtId
    ? RANGPUR_UPAZILAS.filter((u) => u.district_id === districtId)
    : RANGPUR_UPAZILAS;

  // 1. Exact ID match
  const byId = pool.find((u) => u.id === lower);
  if (byId) return byId;

  // 2. Exact English name
  const byEn = pool.find((u) => u.name_en.toLowerCase() === lower);
  if (byEn) return byEn;

  // 3. Bengali name (guard against empty string matching)
  const trimmedUpa = input.trim();
  if (trimmedUpa) {
    const byBn = pool.find(
      (u) => trimmedUpa.includes(u.name_bn) || u.name_bn.includes(trimmedUpa),
    );
    if (byBn) return byBn;
  }

  // 4. Banglish / phonetic aliases
  for (const u of pool) {
    const aliases = UPAZILA_BANGLISH[u.id] || [];
    if (aliases.some((alias) => lower === alias || lower.includes(alias))) {
      return u;
    }
  }

  // 5. First word of upazila name (e.g., "Mithapukur" from "Mithapukur Sadar")
  const firstName = lower.split(" ")[0];
  if (firstName.length >= 4) {
    const byFirst = pool.find(
      (u) => u.name_en.toLowerCase().split(" ")[0] === firstName,
    );
    if (byFirst) return byFirst;
  }

  // 6. Contains (bidirectional)
  if (lower.length >= 3) {
    const contains = pool.find(
      (u) => lower.includes(u.name_en.toLowerCase().split(" ")[0]) || u.name_en.toLowerCase().includes(lower),
    );
    if (contains) return contains;
  }

  // 7. Fuzzy match
  if (lower.length >= 4) {
    const fuzzy = pool.find((u) => {
      const firstPart = u.name_en.split(" ")[0];
      return fuzzyMatch(lower, firstPart) || fuzzyMatch(lower, u.name_en);
    });
    if (fuzzy) return fuzzy;
  }

  return null;
}

// ── Rule-based fallback parser ──────────────────────────────────────

function ruleBasedParse(rawQuery: string): ParsedSearchQuery {
  const text = rawQuery.trim();
  let blood_group: string | null = null;
  let district_id: string | null = null;
  let upazila_id: string | null = null;
  let keywords = text;

  // Blood group
  blood_group = normalizeBloodGroup(text);
  if (blood_group) {
    // remove blood-group-like tokens from keywords (including "plus"/"minus" variants)
    const bgPattern = /\b(?:a|b|ab|o)\s*[+\-]|\b(?:a|b|ab|o)\s*(?:positive|negative|pos|neg|plus|minus)\b/gi;
    keywords = keywords.replace(bgPattern, " ");
  }

  // Phone number detection: Bangladeshi mobile numbers (01XXXXXXXXX)
  const phoneMatch = keywords.match(/(?:\+?88)?01[3-9]\d{8}/);
  let extractedPhone = "";
  if (phoneMatch) {
    extractedPhone = phoneMatch[0];
    keywords = keywords.replace(phoneMatch[0], " ");
  }

  // District — use fuzzy finder
  const districtMatch = findDistrict(keywords);
  if (districtMatch) {
    district_id = districtMatch.id;
    // Remove district name (English + Bengali) from keywords
    keywords = keywords
      .replace(new RegExp(districtMatch.name_en, "gi"), " ")
      .replace(districtMatch.name_bn, " ");
    // Also remove banglish aliases
    const aliases = DISTRICT_BANGLISH[districtMatch.id] || [];
    for (const alias of aliases) {
      keywords = keywords.replace(new RegExp(alias, "gi"), " ");
    }
  }

  // Upazila — scope within found district if any
  const upPool = district_id
    ? RANGPUR_UPAZILAS.filter((u) => u.district_id === district_id)
    : RANGPUR_UPAZILAS;

  // First pass: use fuzzy finder
  const upazilaMatch = findUpazila(keywords, district_id);
  if (upazilaMatch) {
    upazila_id = upazilaMatch.id;
    if (!district_id) district_id = upazilaMatch.district_id;
    // Remove upazila name from keywords
    keywords = keywords
      .replace(new RegExp(upazilaMatch.name_en, "gi"), " ")
      .replace(upazilaMatch.name_bn, " ");
    const aliases = UPAZILA_BANGLISH[upazilaMatch.id] || [];
    for (const alias of aliases) {
      keywords = keywords.replace(new RegExp(alias, "gi"), " ");
    }
  }

  // Second pass: if "sadar" appears and no upazila matched yet, map to district's sadar
  if (!upazila_id && /sadar|সদর/i.test(keywords)) {
    const sadarUpazila = upPool.find((u) => u.id.endsWith("_sadar"));
    if (sadarUpazila) {
      upazila_id = sadarUpazila.id;
      if (!district_id) district_id = sadarUpazila.district_id;
      keywords = keywords.replace(/sadar|সদর/gi, " ");
    }
  }

  // Clean up keywords: collapse spaces, remove filler words
  // English + Bengali + Banglish filler words that aren't names/places
  keywords = keywords
    .replace(/\s+/g, " ")
    // English filler words
    .replace(
      /\b(find|search|donor|donors|blood|need|want|in|from|near|at|of|the|for|please|give|me|i|am|is|are|was|were|looking|urgent|help|a|an|to|with|and|or|my|we|us|our|you|your|his|her|their|this|that|it|has|have|had|can|could|would|should|will|shall|may|might|must|do|does|did|not|no|yes|any|some|all|one|two|who|what|where|when|why|how|which|get|got|show|list|available|contact|number|phone|call|sms|text)\b/gi,
      " ",
    )
    // Bengali filler words
    .replace(
      /\b(রক্ত|দাতা|খুঁজি|চাই|দরকার|এ|থেকে|এর|আমি|আমার|জরুরি|সাহায্য|লাগবে|লাগে|দিন|দাও|কোথায়|কি|কেন|কবে|আছে|নেই|কিন্তু|হবে|হয়|কোনো|একটা|একজন|জন|প্রয়োজন|পারেন|পারবেন|তার|তারা|সে|এই|ওই|তাহলে|কারণ|যাতে|পরে|আগে|ভিতরে|বাইরে|উপরে|নিচে|পাশে|সামনে|পেছনে|দূরে|কাছে)\b/gi,
      " ",
    )
    // Banglish (Bengali in English letters) filler words
    .replace(
      /\b(amar|amr|amake|tomar|tader|amra|tara|lagbe|lagbo|lagse|lagche|dorkar|darkar|dorkor|chai|chaise|khuji|khujchi|khuj|khujo|kothay|rakto|rokto|data|datta|joruri|sahajjo|sahajo|kono|ekta|ekjon|khub|onek|valo|kharap|hobe|hoy|ase|nai|kore|kora|kori|thake|thakbe|din|dao|dey|joruri|proyjon|upokar|somporko|somporker|kaaj|kaj|kormo)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  // Put phone number back as part of keywords for DB search
  if (extractedPhone) {
    keywords = (keywords + " " + extractedPhone).trim();
  }

  const confidence =
    blood_group || district_id || upazila_id ? "high" : keywords.length > 0 ? "medium" : "low";

  return {
    blood_group,
    district_id,
    upazila_id,
    keywords,
    confidence,
    ai_used: false,
  };
}

// ── LLM-based parser ───────────────────────────────────────────────

async function aiParse(rawQuery: string): Promise<ParsedSearchQuery | null> {
  const provider = getActiveProvider();
  if (!provider) return null;


  const systemPrompt = "";

  try {
    const result = await callLLM(
      `${systemPrompt}\n\nUser query: "${rawQuery}"\n\nJSON:`,
      { jsonMode: true, temperature: 0.0, maxTokens: 500 },
    );
    if (!result) return null;

    const jsonStr = extractJSON(result.text);
    const parsed = JSON.parse(jsonStr);

    // Validate blood group
    let bg: string | null = null;
    if (parsed.blood_group && typeof parsed.blood_group === "string") {
      bg = normalizeBloodGroup(parsed.blood_group) || null;
    }

    // Validate district_id
    let distId: string | null = null;
    if (parsed.district_id && typeof parsed.district_id === "string") {
      const d = RANGPUR_DISTRICTS.find(
        (x) => x.id === parsed.district_id.toLowerCase(),
      );
      if (d) distId = d.id;
    }
    // If upazila found but district missing, fill from upazila's parent
    let upaId: string | null = null;
    if (parsed.upazila_id && typeof parsed.upazila_id === "string") {
      const u = RANGPUR_UPAZILAS.find((x) => x.id === parsed.upazila_id.toLowerCase());
      if (u) {
        upaId = u.id;
        if (!distId) distId = u.district_id;
      }
    }

    const kw = typeof parsed.keywords === "string" ? parsed.keywords.trim() : "";

    // Merge AI extraction with rule-based blood group detection as safety net
    const ruleBg = normalizeBloodGroup(rawQuery);
    if (!bg && ruleBg) bg = ruleBg;

    const hasStructured = bg || distId || upaId;
    return {
      blood_group: bg,
      district_id: distId,
      upazila_id: upaId,
      keywords: kw || (hasStructured ? "" : rawQuery.trim()),
      confidence: hasStructured ? "high" : kw ? "medium" : "low",
      ai_used: true,
    };
  } catch (e) {
    console.warn("[AI search] JSON parse failed:", e);
    return null;
  }
}

// ── Public server action ────────────────────────────────────────────

/**
 * Parse a natural-language donor search query into structured filters.
 * Tries LLM first; falls back to rule-based regex/keyword parsing.
 * Always returns a result (never throws) — graceful degradation.
 */
export async function serverParseSearchQuery(
  rawQuery: string,
): Promise<ParsedSearchQuery> {
  const query = (rawQuery || "").trim();
  if (!query) {
    return {
      blood_group: null,
      district_id: null,
      upazila_id: null,
      keywords: "",
      confidence: "low",
      ai_used: false,
    };
  }

  // Run rule-based parse FIRST (fast, reliable for common patterns)
  const ruleResult = ruleBasedParse(query);

  // If rule-based parse already found any structured field (blood group, district, upazila)
  // or a phone number, skip AI (saves time & API cost for obvious queries)
  const hasStrongRuleResult =
    ruleResult.blood_group ||
    ruleResult.district_id ||
    ruleResult.upazila_id ||
    /\b01[3-9]\d{8}\b/.test(query);

  if (hasStrongRuleResult) {
    return ruleResult;
  }

  // Try AI for ambiguous queries (names, typos, mixed Banglish)
  const provider = getActiveProvider();
  if (provider) {
    try {
      const aiResult = await aiParse(query);
      if (aiResult) {
        // Merge: if AI found district/upazila but rule-based didn't, use AI.
        // If both found something, prefer AI for district/upazila, keep rule-based blood group as fallback.
        // IMPORTANT: for keywords, use AI's result if AI was used (even if empty string),
        // because AI may have consumed the blood group / location words that rule-based missed.
        // Only fall back to ruleResult.keywords if AI didn't extract any structured fields.
        const aiExtractedSomething =
          aiResult.blood_group || aiResult.district_id || aiResult.upazila_id;
        return {
          blood_group: aiResult.blood_group || ruleResult.blood_group,
          district_id: aiResult.district_id || ruleResult.district_id,
          upazila_id: aiResult.upazila_id || ruleResult.upazila_id,
          keywords: aiExtractedSomething
            ? aiResult.keywords  // AI consumed the query — use its keywords (may be "")
            : ruleResult.keywords, // AI found nothing structured — keep rule-based keywords
          confidence: aiResult.confidence,
          ai_used: true,
        };
      }
    } catch (e) {
      console.warn("[AI search] LLM parse failed, using rule-based:", e);
    }
  }

  return ruleResult;
}
