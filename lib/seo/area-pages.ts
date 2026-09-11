import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  RANGPUR_UNIONS,
} from "@/lib/constants/rangpur";

export type Area = {
  slug: string;
  id: string;
  kind: "upazila" | "union" | "bazar";
  nameEn: string;
  nameBn: string;
  banglish: string;
  districtId: string;
  districtNameEn: string;
  districtNameBn: string;
  upazilaId?: string;
  upazilaNameEn?: string;
  upazilaNameBn?: string;
};

// Bengali → Latin (Banglish) transliteration map.
const CONSONANTS: Record<string, string> = {
  ক: "k", খ: "kh", গ: "g", ঘ: "gh", ঙ: "ng",
  চ: "ch", ছ: "chh", জ: "j", ঝ: "jh", ঞ: "n",
  ট: "t", ঠ: "th", ড: "d", ঢ: "dh", ণ: "n",
  ত: "t", থ: "th", দ: "d", ধ: "dh", ন: "n",
  প: "p", ফ: "f", ব: "b", ভ: "bh", ম: "m",
  য: "j", র: "r", ল: "l", শ: "sh", ষ: "sh",
  স: "s", হ: "h", ড়: "r", ঢ়: "rh", য়: "y", ৎ: "t",
};

const VOWEL_SIGNS: Record<string, string> = {
  "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u",
  "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  অ: "o", আ: "a", ই: "i", ঈ: "i", উ: "u", ঊ: "u",
  ঋ: "ri", এ: "e", ঐ: "oi", ও: "o", ঔ: "ou",
};

const OTHER: Record<string, string> = { "ং": "ng", "ঃ": "", "ঁ": "" };

const VIPER = "্";

export function toBanglish(input: string): string {
  const chars = Array.from(input);
  let out = "";

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (CONSONANTS[ch] !== undefined) {
      const cons = CONSONANTS[ch];
      if (next && VOWEL_SIGNS[next] !== undefined) {
        out += cons + VOWEL_SIGNS[next];
        i++;
      } else if (next === VIPER) {
        out += cons;
        i++;
      } else if (next === undefined || next === " ") {
        out += cons;
      } else {
        out += cons + "o";
      }
    } else if (VOWEL_SIGNS[ch] !== undefined) {
      out += VOWEL_SIGNS[ch];
    } else if (INDEPENDENT_VOWELS[ch] !== undefined) {
      out += INDEPENDENT_VOWELS[ch];
    } else if (OTHER[ch] !== undefined) {
      out += OTHER[ch];
    } else if (ch === VIPER) {
      // skip stray virama
    } else {
      out += ch;
    }
  }

  return out.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const districtById = new Map(RANGPUR_DISTRICTS.map((d) => [d.id, d]));
const upazilaById = new Map(RANGPUR_UPAZILAS.map((u) => [u.id, u]));

function slugify(id: string): string {
  return id.replace(/_/g, "-");
}

function buildAreas(): Area[] {
  const upazilaAreas: Area[] = RANGPUR_UPAZILAS.map((u) => {
    const district = districtById.get(u.district_id);
    return {
      slug: slugify(u.id),
      id: u.id,
      kind: "upazila" as const,
      nameEn: u.name_en,
      nameBn: u.name_bn,
      banglish: toBanglish(u.name_bn),
      districtId: u.district_id,
      districtNameEn: district?.name_en ?? "",
      districtNameBn: district?.name_bn ?? "",
    };
  });

  const unionAreas: Area[] = RANGPUR_UNIONS.map((un) => {
    const upazila = upazilaById.get(un.upazila_id);
    const district = upazila ? districtById.get(upazila.district_id) : undefined;
    return {
      slug: slugify(un.id),
      id: un.id,
      kind: "union" as const,
      nameEn: un.name_en,
      nameBn: un.name_bn,
      banglish: toBanglish(un.name_bn),
      districtId: district?.id ?? "rangpur",
      districtNameEn: district?.name_en ?? "Rangpur",
      districtNameBn: district?.name_bn ?? "রংপুর",
      upazilaId: un.upazila_id,
      upazilaNameEn: upazila?.name_en ?? "",
      upazilaNameBn: upazila?.name_bn ?? "",
    };
  });

  // Paglapir Bazar — a market locality under Paglapir upazila, given its own
  // landing page right after Sadar priority.
  const paglapirBazar: Area = {
    slug: "paglapir-bazar",
    id: "paglapir_bazar",
    kind: "bazar",
    nameEn: "Paglapir Bazar",
    nameBn: "পাগলাপীর বাজার",
    banglish: toBanglish("পাগলাপীর বাজার"),
    districtId: "rangpur",
    districtNameEn: "Rangpur",
    districtNameBn: "রংপুর",
    upazilaId: "rangpur_paglapir",
    upazilaNameEn: "Paglapir",
    upazilaNameBn: "পাগলাপীর",
  };

  // Priority order: Rangpur Sadar → its unions → Paglapir + Bazar → the rest.
  const rangpurSadar = upazilaAreas.find((a) => a.id === "rangpur_sadar");
  const paglapir = upazilaAreas.find((a) => a.id === "rangpur_paglapir");
  const others = upazilaAreas.filter(
    (a) => a.id !== "rangpur_sadar" && a.id !== "rangpur_paglapir",
  );

  const ordered: Area[] = [];
  if (rangpurSadar) ordered.push(rangpurSadar);
  ordered.push(...unionAreas);
  if (paglapir) ordered.push(paglapir);
  ordered.push(paglapirBazar);
  ordered.push(...others);
  return ordered;
}

export const ALL_AREAS: Area[] = buildAreas();

export const ALL_AREAS_BY_SLUG = new Map(ALL_AREAS.map((a) => [a.slug, a]));

export function getAreaBySlug(slug: string): Area | undefined {
  return ALL_AREAS_BY_SLUG.get(slug);
}

export function getRangpurSadarWithUnions(): Area[] {
  const sadar = ALL_AREAS.filter((a) => a.id === "rangpur_sadar" && a.kind === "upazila");
  const unions = ALL_AREAS.filter((a) => a.kind === "union");
  return [...sadar, ...unions];
}

export function getPaglapirAreas(): Area[] {
  return ALL_AREAS.filter(
    (a) => a.id === "rangpur_paglapir" || a.id === "paglapir_bazar",
  );
}

export function getAreasGroupedByDistrict(): { districtId: string; nameEn: string; nameBn: string; areas: Area[] }[] {
  const featuredIds = new Set(["rangpur_sadar", "rangpur_paglapir"]);
  return RANGPUR_DISTRICTS.map((d) => ({
    districtId: d.id,
    nameEn: d.name_en,
    nameBn: d.name_bn,
    areas: ALL_AREAS.filter(
      (a) => a.districtId === d.id && a.kind === "upazila" && !featuredIds.has(a.id),
    ),
  }));
}

export type AreaMeta = {
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  heading: string;
};

export function getAreaMeta(area: Area, locale: string): AreaMeta {
  const isBn = locale === "bn";
  const name = isBn ? area.nameBn : area.nameEn;
  const district = isBn ? area.districtNameBn : area.districtNameEn;
  const banglish = `${area.banglish} Blood Bank`.toLowerCase();

  const kindWordBn =
    area.kind === "union" ? "ইউনিয়ন" : "";
  const kindWordEn =
    area.kind === "union" ? "Union" : "";

  const title = isBn
    ? kindWordBn
      ? `${name} ${kindWordBn} ব্লাড ব্যাংক — ${name} রক্তদাতা`
      : `${name} ব্লাড ব্যাংক — ${name} রক্তদাতা ও রক্তদান`
    : kindWordEn
      ? `${name} ${kindWordEn} Blood Bank — Blood Donors in ${name}`
      : `${name} Blood Bank — Blood Donors in ${name}`;

  const description = isBn
    ? `${district}, রংপুর বিভাগের ${name}${kindWordBn ? ` ${kindWordBn}` : ""}${area.upazilaNameBn && area.kind === "union" ? `, ${area.upazilaNameBn} উপজেলা` : ""} এলাকায় রক্তদাতা খুঁজুন ও জরুরি রক্তের জন্য অনুরোধ করুন। তৃণমূল ব্লাড ব্যাংক রংপুর ${name} এলাকার রক্তদাতা, রোগী ও হাসপাতালকে যুক্ত করে প্রাণ বাঁচাতে সহায়তা করে।`
    : `Find blood donors and request emergency blood in ${name}${kindWordEn ? ` ${kindWordEn}` : ""}${area.upazilaNameEn && area.kind === "union" ? `, ${area.upazilaNameEn} upazila` : ""}, ${district} district, Rangpur division, Bangladesh. Trinomul Blood Bank Rangpur connects donors, patients and hospitals in ${name} to save lives.`;

  const keywords = Array.from(
    new Set([
      // English
      `${area.nameEn} blood bank`,
      `${area.nameEn} blood donors`,
      `${area.nameEn} blood donation`,
      `blood donors ${area.nameEn}`,
      `blood bank ${area.nameEn}`,
      `${area.districtNameEn} blood bank`,
      ...(area.upazilaNameEn ? [
        `${area.upazilaNameEn} blood bank`,
        `${area.upazilaNameEn} blood donors`,
        `blood donors ${area.upazilaNameEn}`,
      ] : []),
      // Banglish
      `${area.nameEn.toLowerCase()} blood bank`,
      banglish,
      `rokto dan ${area.banglish.toLowerCase()}`,
      `blood donor ${area.banglish.toLowerCase()}`,
      // Bangla
      `${area.nameBn} ব্লাড ব্যাংক`,
      `${area.nameBn} রক্তদাতা`,
      `${area.nameBn} রক্তদান`,
      `${area.districtNameBn} ব্লাড ব্যাংক`,
      ...(area.upazilaNameBn ? [
        `${area.upazilaNameBn} ব্লাড ব্যাংক`,
        `${area.upazilaNameBn} রক্তদাতা`,
      ] : []),
      "রক্তদাতা রংপুর",
      "রক্তদান রংপুর",
    ]),
  );

  return {
    title,
    description,
    keywords,
    h1: isBn
      ? `${name}${kindWordBn ? ` ${kindWordBn}` : ""} ব্লাড ব্যাংক`
      : `${name}${kindWordEn ? ` ${kindWordEn}` : ""} Blood Bank`,
    heading: name,
  };
}