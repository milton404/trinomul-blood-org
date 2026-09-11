const FALLBACK_SITE_URL = "https://trinomul.vercel.app";

function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL)
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");
  try {
    new URL(raw);
    return raw;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "Trinomul Blood Bank Rangpur";
export const SITE_NAME_SHORT = "Trinomul";
export const SITE_NAME_BN = "তৃণমূল ব্লাড ব্যাংক রংপুর";
export const SITE_NAME_BN_SHORT = "তৃণমূল";

export const LOCALES = ["en", "bn"] as const;
export const DEFAULT_LOCALE = "bn";

export const LOGO_URL = `${SITE_URL}/trinomul-logo.png`;

export const KEYWORDS_EN = [
  "blood bank Rangpur",
  "blood donation Rangpur",
  "blood donor Rangpur",
  "find blood donor Bangladesh",
  "donate blood Rangpur division",
  "emergency blood Bangladesh",
  "blood request Rangpur",
  "blood group search",
  "Rangpur blood bank",
  "blood donors Dinajpur",
  "blood donors Kurigram",
  "blood donors Lalmonirhat",
  "blood donors Nilphamari",
  "blood donors Gaibandha",
  "blood donors Thakurgaon",
  "blood donors Panchagarh",
  "Trinomul Blood Bank Rangpur",
  "rare blood group Bangladesh",
  "O negative blood Rangpur",
  "Rangpur division",
];

export const KEYWORDS_BN = [
  "রক্তদান রংপুর",
  "ব্লাড ব্যাংক রংপুর",
  "রক্তদাতা রংপুর",
  "রক্তের গ্রুপ",
  "জরুরি রক্ত",
  "রক্ত দরকার",
  "রক্তদান বাংলাদেশ",
  "রংপুর বিভাগ",
  "রক্তের অনুরোধ",
  "ব্লাড ডোনার খোঁজা",
  "রক্তদানে উৎসাহ",
  "তৃণমূল ব্লাড ব্যাংক",
];

export const KEYWORDS_BANGLISH = [
  "blood bank rangpur",
  "blood donor rangpur",
  "rokto dan rangpur",
  "rokto donor rangpur",
  "emergency blood bangladesh",
  "blood group search bangladesh",
  "donate blood rangpur division",
  "trinomul blood bank",
  "blood dan korte chai",
  "rôkter grūp",
];

export type SeoTexts = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string[];
  ogLocale: string;
  ogLocaleAlternate: string;
};

const TEXTS: Record<string, Pick<SeoTexts, "title" | "description" | "ogTitle" | "ogDescription" | "ogLocale" | "ogLocaleAlternate">> = {
  en: {
    title: SITE_NAME,
    ogTitle: `${SITE_NAME} — Find Blood Donors & Request Blood`,
    description:
      "Trinomul Blood Bank Rangpur connects blood donors, patients and hospitals across Rangpur division, Bangladesh. Find blood donors, request blood in an emergency and donate blood to save lives in Rangpur, Dinajpur, Kurigram, Lalmonirhat, Nilphamari, Gaibandha, Thakurgaon and Panchagarh.",
    ogDescription:
      "Find blood donors and request blood in an emergency across Rangpur division, Bangladesh. Join Trinomul Blood Bank Rangpur and save lives.",
    ogLocale: "en_US",
    ogLocaleAlternate: "bn_BD",
  },
  bn: {
    title: SITE_NAME_BN,
    ogTitle: `${SITE_NAME_BN} — রক্তদাতা খুঁজুন ও রক্তের অনুরোধ করুন`,
    description:
      "তৃণমূল ব্লাড ব্যাংক রংপুর — রংপুর বিভাগের রক্তদাতা, রোগী ও হাসপাতালকে যুক্ত করে এক প্ল্যাটফর্মে। রক্তদাতা খুঁজুন, জরুরি রক্তের অনুরোধ করুন এবং রক্তদান করে বাঁচান প্রাণ। রংপুর, দিনাজপুর, কুড়িগ্রাম, লালমনিরহাট, নীলফামারী, গাইবান্ধা, ঠাকুরগাঁও ও পঞ্চগড় জুড়ে।",
    ogDescription:
      "রংপুর বিভাগে রক্তদাতা খুঁজুন ও জরুরি রক্তের অনুরোধ করুন। তৃণমূল ব্লাড ব্যাংক রংপুরে যোগ দিন এবং প্রাণ বাঁচান।",
    ogLocale: "bn_BD",
    ogLocaleAlternate: "en_US",
  },
};

export function getSeoTexts(locale: string): SeoTexts {
  const base = TEXTS[locale] ?? TEXTS.en;
  const keywords = Array.from(new Set([...KEYWORDS_EN, ...KEYWORDS_BN, ...KEYWORDS_BANGLISH]));
  return { ...base, keywords };
}

export function absoluteUrl(path = ""): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function organizationJsonLd(locale: string) {
  const isBn = locale === "bn";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NGO",
        "@id": `${SITE_URL}/#organization`,
        name: isBn ? SITE_NAME_BN : SITE_NAME,
        alternateName: isBn
          ? [SITE_NAME, SITE_NAME_SHORT, "Trinomul"]
          : [SITE_NAME_BN, SITE_NAME_SHORT, "তৃণমূল", "Trinomul"],
        url: `${SITE_URL}/`,
        logo: { "@type": "ImageObject", url: LOGO_URL },
        image: LOGO_URL,
        description: isBn ? TEXTS.bn.description : TEXTS.en.description,
        areaServed: {
          "@type": "AdministrativeArea",
          name: "Rangpur Division, Bangladesh",
        },
        foundingLocation: {
          "@type": "Place",
          name: "Rangpur, Bangladesh",
        },
        knowsAbout: [
          "Blood donation",
          "Blood donor",
          "Blood bank",
          "Emergency blood request",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: isBn ? SITE_NAME_BN : SITE_NAME,
        description: isBn ? TEXTS.bn.description : TEXTS.en.description,
        inLanguage: [locale, "en", "bn"],
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/${locale}/donors?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}