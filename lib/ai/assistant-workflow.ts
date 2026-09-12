import { RANGPUR_DISTRICTS, RANGPUR_UPAZILAS } from "@/lib/constants/rangpur";

export type AssistantLanguage = "bn" | "en";
export type AssistantWorkflow =
  | "eligibility"
  | "donor_search"
  | "track_request"
  | "request_guidance";
export type AssistantPendingField =
  | "age"
  | "weight"
  | "chronicIllness"
  | "previousDonation"
  | "donationType"
  | "donationDate"
  | "bloodGroup"
  | "location"
  | "trackingCode"
  | "units"
  | "urgency";

export interface AssistantWorkflowState {
  version: 1;
  flow: AssistantWorkflow;
  pendingField: AssistantPendingField;
  locale: AssistantLanguage;
  values: {
    age?: number;
    weight?: number;
    chronicIllness?: boolean;
    previousDonation?: boolean;
    donationType?: "whole_blood" | "plasma" | "platelets";
    donationDate?: string;
    bloodGroup?: string;
    location?: string;
    district?: string;
    upazila?: string;
    units?: number;
    urgency?: "normal" | "urgent" | "critical";
  };
}

export interface WorkflowResult {
  reply: string;
  state: AssistantWorkflowState | null;
  shouldSearchDonors?: boolean;
  shouldTrackRequest?: boolean;
  needsLocationPermission?: boolean;
}

const BLOOD_GROUP_PATTERN = /\b(AB|A|B|O)\s*([+-])(?=\s|$|[.,!?])/i;
const BANGLISH_GROUP_PATTERN = /\b(ab|ay bi|ei bi|bee|bi|b|a|o|oh)\s+(positive|plus|pos|negative|neg|minus)\b/i;
const BANGLA_GROUP_PATTERN = /(এবি|এ\s*বি|বী|বি|এ|ও)\s*(প্লাস|পজিটিভ|পজেটিভ|নেগেটিভ|নেগাটিভ|মাইনাস)/;
const ANY_BLOOD_GROUP_PATTERN = /\b(any|anything|anyone|whatever|j\s*kono|j\s*konu|je\s*kono|ja\s*kono)\b|যেকোনো|যেকোন|যে\s*কোনো|যে\s*কোন|যে\s*কেউ|যেকেউ|সব\s*গ্রুপ|সব\s*রকম/i;
const BANGLISH_PATTERN = /\b(amar|amr|rokto|rokter|lagbe|dorkar|donar|khujte|kothay|ache|ase|koi|chai|parbo|pari|din|dao|kivabe|hobo|hote|pabo)\b/i;

export function detectAssistantLanguage(message: string): AssistantLanguage {
  if (/[\u0980-\u09FF]/.test(message) || BANGLISH_PATTERN.test(message)) {
    return "bn";
  }
  return "en";
}

function text(locale: AssistantLanguage, bangla: string, english: string): string {
  return locale === "bn" ? bangla : english;
}

function askFor(field: AssistantPendingField, locale: AssistantLanguage): string {
  const prompts: Record<AssistantPendingField, [string, string]> = {
    age: ["আপনার বয়স কত?", "What is your age?"],
    weight: ["আপনার ওজন কত কেজি?", "What is your weight in kg?"],
    chronicIllness: [
      "আপনার কোনো দীর্ঘমেয়াদী রোগ আছে কি? (যেমন: ডায়াবেটিস, উচ্চ রক্তচাপ) — হ্যাঁ/না",
      "Do you have any chronic illness (e.g., diabetes, high blood pressure)? Yes/No",
    ],
    previousDonation: [
      "আপনি আগে কখনো রক্ত দিয়েছেন? হ্যাঁ/না",
      "Have you donated blood before? Yes/No",
    ],
    donationType: [
      "শেষ কোন ধরনের রক্তদান করেছেন? (whole blood / plasma / platelets)",
      "Which type was your last donation? (whole blood / plasma / platelets)",
    ],
    donationDate: [
      "শেষ কবে রক্ত দান করেছেন? (তারিখ দিন)",
      "When was your last donation? (please give the date)",
    ],
    bloodGroup: [
      "কোন রক্তের গ্রুপ প্রয়োজন? (যেমন: A+, O-)",
      "Which blood group do you need? (e.g., A+, O-)",
    ],
    location: [
      "কোন এলাকায় রক্ত প্রয়োজন? (জেলা বা উপজেলার নাম)",
      "Which area do you need blood in? (district or upazila name)",
    ],
    trackingCode: [
      "আপনার ট্র্যাকিং কোডটি দিন (যেমন: TBB-2024-XXXX)",
      "Please share your tracking code (e.g., TBB-2024-XXXX)",
    ],
    units: [
      "কত ইউনিট রক্ত প্রয়োজন?",
      "How many units of blood do you need?",
    ],
    urgency: [
      "কতটা জরুরি? (normal / urgent / critical)",
      "How urgent is it? (normal / urgent / critical)",
    ],
  };
  const [bangla, english] = prompts[field];
  return text(locale, bangla, english);
}

/** Re-ask for a location when the typed area is not recognised, listing
 *  valid districts so the user can pick one instead of getting a
 *  misleading empty result. */
function askForUnknownArea(locale: AssistantLanguage): string {
  const districts = districtOptionsText();
  return text(
    locale,
    `দুঃখিত, এই এলাকাটি খুঁজে পাইনি। অনুগ্রহ করে জেলার নাম লিখুন: ${districts}। উপজেলা লিখলে জেলার নামও দিন (যেমন: "পীরগঞ্জ, রংপুর")।`,
    `Sorry, I couldn't find that area. Please name a district: ${districts}. If you give an upazila, add its district too (e.g. "Pirganj, Rangpur").`,
  );
}

function normalizeBanglaGroup(word: string): "A" | "B" | "O" | "AB" | undefined {
  const w = word.replace(/\s+/g, "");
  if (w === "এবি") return "AB";
  if (w === "এ") return "A";
  if (w === "বী" || w === "বি") return "B";
  if (w === "ও") return "O";
  return undefined;
}

function normalizeBanglishGroup(word: string): "A" | "B" | "O" | "AB" | undefined {
  const w = word.toLowerCase().replace(/\s+/g, "");
  if (w === "ab" || w === "aybi" || w === "eibi") return "AB";
  if (w === "a") return "A";
  if (w === "b" || w === "bi" || w === "bee") return "B";
  if (w === "o" || w === "oh") return "O";
  return undefined;
}

export function getBloodGroup(message: string): string | undefined {
  if (ANY_BLOOD_GROUP_PATTERN.test(message)) return "ANY";

  const latin = message.match(BLOOD_GROUP_PATTERN);
  if (latin) return `${latin[1].toUpperCase()}${latin[2]}`;

  const bangla = message.match(BANGLA_GROUP_PATTERN);
  if (bangla) {
    const group = normalizeBanglaGroup(bangla[1]);
    const sign = /^(প্লাস|পজিটিভ|পজেটিভ)$/.test(bangla[2]) ? "+" : "-";
    if (group) return `${group}${sign}`;
  }

  const banglish = message.match(BANGLISH_GROUP_PATTERN);
  if (banglish) {
    const group = normalizeBanglishGroup(banglish[1]);
    const sign = /^(positive|plus|pos)$/i.test(banglish[2]) ? "+" : "-";
    if (group) return `${group}${sign}`;
  }

  return undefined;
}

function isYes(message: string): boolean {
  return /^(yes|y|ha|hya|হ্যাঁ|হা|জি|আছে|আছে\s+তো)$/i.test(message.trim());
}

function isNo(message: string): boolean {
  return /^(no|n|na|nah|না|নেই|নাই)$/i.test(message.trim());
}

export function isNearMe(message: string): boolean {
  return /\b(near me|nearby|around me|closest|amar kache|kacher|amar area)\b|আমার\s*(কাছে|এলাকায়)|কাছাকাছি/i.test(message);
}

// ── Area resolution ─────────────────────────────────────────────────

export interface ResolvedArea {
  district?: string;
  upazila?: string;
}

function canonicalArea(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAreaSuffix(value: string): string {
  return value
    .replace(/\b(sadar|sodor)\b/g, " ")
    .replace(/\b(zila|zilla|district|jela|upazila|upozila|thana)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function districtNameById(districtId: string): string | undefined {
  return RANGPUR_DISTRICTS.find((d) => d.id === districtId)?.name_en;
}

function matchDistrict(value: string) {
  return RANGPUR_DISTRICTS.find(
    (d) =>
      d.id === value ||
      canonicalArea(d.name_en) === value ||
      canonicalArea(d.name_bn) === value,
  );
}

function matchUpazilas(value: string) {
  return RANGPUR_UPAZILAS.filter(
    (u) =>
      canonicalArea(u.name_en) === value ||
      canonicalArea(u.name_bn) === value ||
      u.id.replace(/_/g, " ") === value,
  );
}

/**
 * Resolve a free-text location into a district and/or upazila.
 *
 * Returns null when the text matches nothing, so callers can re-ask
 * instead of silently searching a place that does not exist (which used
 * to produce a misleading "0 donors found near you" answer).
 *
 * Upazila names that exist in more than one district (Pirganj, Phulbari)
 * are only resolved when the district is unambiguous — either because
 * the name maps to a single district, or because the user wrote
 * "upazila, district". Otherwise null is returned so the bot asks which
 * district they mean.
 */
export function resolveArea(input: string): ResolvedArea | null {
  // "Pirganj, Rangpur" — disambiguate an upazila by its district.
  // Check the comma on the RAW input: canonicalArea() strips punctuation,
  // so the comma is gone by the time we canonicalize.
  const rawInput = input.trim();
  if (rawInput.includes(",")) {
    const [areaPart, districtPart] = rawInput.split(",").map((s) => canonicalArea(s));
    const district = districtPart ? matchDistrict(districtPart) : undefined;
    if (district && areaPart) {
      const upazila = RANGPUR_UPAZILAS.find(
        (u) =>
          u.district_id === district.id &&
          (canonicalArea(u.name_en) === areaPart ||
            canonicalArea(u.name_bn) === areaPart),
      );
      return upazila
        ? { upazila: upazila.name_en, district: district.name_en }
        : { district: district.name_en };
    }
    if (district) return { district: district.name_en };
    if (areaPart) return resolveArea(areaPart);
    return null;
  }

  const raw = canonicalArea(input);
  if (!raw) return null;

  const upazilaMatches = matchUpazilas(raw);
  if (upazilaMatches.length === 1) {
    const u = upazilaMatches[0];
    return { upazila: u.name_en, district: districtNameById(u.district_id) };
  }
  if (upazilaMatches.length > 1) {
    // Ambiguous upazila name — prefer the home district, otherwise ask.
    const home = upazilaMatches.find((u) => u.district_id === "rangpur");
    if (home) return { upazila: home.name_en, district: districtNameById(home.district_id) };
    return null;
  }

  const districtExact = matchDistrict(raw);
  if (districtExact) return { district: districtExact.name_en };

  // Loose pass: "Rangpur Sadar" → upazila, "Rangpur Zila" → district.
  const hasDistrictSuffix = /\b(zila|zilla|district|jela)\b/i.test(raw);
  const stripped = stripAreaSuffix(raw);
  if (stripped && stripped !== raw) {
    // A district suffix means the user means the district, not the
    // same-named "Sadar" upazila — so skip the upazila loose match.
    if (!hasDistrictSuffix) {
      const looseUpazilas = RANGPUR_UPAZILAS.filter(
        (u) => stripAreaSuffix(canonicalArea(u.name_en)) === stripped,
      );
      if (looseUpazilas.length === 1) {
        const u = looseUpazilas[0];
        return { upazila: u.name_en, district: districtNameById(u.district_id) };
      }
    }
    const looseDistrict = RANGPUR_DISTRICTS.find(
      (d) => stripAreaSuffix(canonicalArea(d.name_en)) === stripped || d.id === stripped,
    );
    if (looseDistrict) return { district: looseDistrict.name_en };
  }

  return null;
}

/** Human-readable district list for re-ask prompts. */
export function districtOptionsText(): string {
  return RANGPUR_DISTRICTS.map((d) => d.name_en).join(", ");
}

function isEligibilityStart(message: string): boolean {
  return /can\s+i\s+donate|eligible|eligib|donate\s+blood|রক্ত\s*দিতে\s*পারি|রক্তদান.*যোগ্য|rokto\s*dite\s*pari/i.test(message);
}

function isTrackingStart(message: string): boolean {
  return /track|tracking|status|ট্র্যাক|রিকোয়েস্ট.*অবস্থা|request.*status/i.test(message);
}

function isRequestStart(message: string): boolean {
  return /blood\s*request|request\s*blood|make\s*a\s*request|create\s*a\s*request|submit\s*a\s*request|request\s+korte|request\s+korbo|রক্তের\s*(রিকোয়েস্ট|আবেদন)|রিকোয়েস্ট|রক্ত\s*চাই\s*রিকোয়েস্ট/i.test(message);
}

export function isBloodAvailabilityQuestion(message: string): boolean {
  const english = /\b(how many|available|availability|any donor|do we have|have.*donor|donor ache|donor ase|blood ache|blood ase)\b/i;
  // Banglish count phrasings: "koto jon", "koy jon", "koto joner", "koyta ache"
  const banglish = /\b(koto|koy|koyta|kotota|kotojon)\b[\s\S]{0,25}\b(jon|joner|dati|donta|ache|ase|donor|donar|rokto)\b/i;
  const bangla = /কতজন|কত\s*জন|কয়জন|কয়\s*জন|কোনো.*দাতা.*(আছে|আছে কি)|দাতা.*(আছে|আছে কি)|রক্ত.*(আছে|আছে কি)/;
  return english.test(message) || banglish.test(message) || bangla.test(message);
}

function isBloodNeed(message: string): boolean {
  return /\b(need|find|looking|search|donor|blood)\b|রক্ত.*(লাগবে|দরকার)|দাতা.*(খুঁজ|লাগবে)|rokto.*(lagbe|dorkar)|donor.*(lagbe|khuj)/i.test(message);
}

function isHowToBecomeDonor(message: string): boolean {
  const english = /\b(become|being|be|register|join)[\s\S]*?\b(donor|donar)\b|\bhow\s+(to|do|can|would)[\s\S]*?\bdonat\w*\b|\b(want|wanna)\s+to?[\s\S]*?\bdonat\w*\b|\bsign\s+up[\s\S]*?\b(donor|donate)\b/i;
  const bangla = /রক্তদাতা\s*হতে|রক্ত\s*দাতা\s*হতে|রক্ত\s*দিতে\s*চাই|রক্তদান\s*করতে\s*চাই|রক্ত\s*দান\s*করতে\s*চাই/i;
  const banglish = /\b(donar|donor)\s+hobo\b|\b(donar|donor)\s+hote\s+chai\b|kivabe[\s\S]*?\b(donar|donor)\b[\s\S]*?\b(hobo|hote)\b/i;
  return english.test(message) || bangla.test(message) || banglish.test(message);
}

function startState(
  flow: AssistantWorkflow,
  pendingField: AssistantPendingField,
  locale: AssistantLanguage,
  values: AssistantWorkflowState["values"] = {},
): AssistantWorkflowState {
  return { version: 1, flow, pendingField, locale, values };
}

function parseDonationType(message: string): AssistantWorkflowState["values"]["donationType"] | undefined {
  if (/platelet|প্লেটলেট/i.test(message)) return "platelets";
  if (/plasma|প্লাজমা/i.test(message)) return "plasma";
  if (/whole|পূর্ণ|সম্পূর্ণ|রক্ত/i.test(message)) return "whole_blood";
  return undefined;
}

function isDate(message: string): boolean {
  return !Number.isNaN(Date.parse(message));
}

function eligibilityResult(state: AssistantWorkflowState): WorkflowResult {
  const { age, weight, chronicIllness, previousDonation, donationType, donationDate } = state.values;
  const locale = state.locale;
  const interval = donationType === "plasma" ? 30 : donationType === "platelets" ? 14 : 90;
  const lastDonationEligible = !previousDonation || !donationDate ||
    Date.now() - new Date(donationDate).getTime() >= interval * 24 * 60 * 60 * 1000;
  const eligible = Boolean(age && age >= 18 && age <= 60 && weight && weight >= 50 && !chronicIllness && lastDonationEligible);
  const result = eligible
    ? text(locale, "আপনার দেওয়া তথ্য অনুযায়ী প্রাথমিকভাবে আপনি রক্ত দিতে উপযুক্ত হতে পারেন।", "Based on the information you provided, you may be eligible to donate blood.")
    : text(locale, "আপনার দেওয়া তথ্য অনুযায়ী এখন রক্তদান উপযুক্ত নাও হতে পারে।", "Based on the information you provided, you may not be eligible to donate at this time.");
  const reminder = text(locale, "চূড়ান্ত সিদ্ধান্ত রক্তদানকেন্দ্রের স্বাস্থ্য পরীক্ষা ও চিকিৎসকের মূল্যায়নের পর হবে। সাধারণভাবে বয়স ১৮-৬০ বছর, ওজন ৫০ কেজি বা বেশি, সুস্থ থাকা, এবং শেষ whole blood দানের পর অন্তত ৯০ দিন থাকতে হয় (plasma ৩০ দিন, platelets ১৪ দিন)।", "Final eligibility is decided through blood-bank screening and medical assessment. In general, donors must be 18-60, weigh at least 50 kg, be healthy, and wait at least 90 days after whole blood donation (30 days for plasma and 14 days for platelets).");
  return { reply: `${result}\n\n${reminder}`, state: null };
}

function parseUrgency(message: string): AssistantWorkflowState["values"]["urgency"] | undefined {
  if (/critical|ক্রিটিক্যাল|সাংঘাতিক|জীবন.*ঝুঁকি|অতি.*জরুরি/i.test(message)) return "critical";
  if (/urgent|জরুরি|জরুরী|asap|তাড়াতাড়ি|দ্রুত/i.test(message)) return "urgent";
  if (/normal|স্বাভাবিক|জরুরি\s*নয়|আস্তে/i.test(message)) return "normal";
  return undefined;
}

function requestGuidanceResult(state: AssistantWorkflowState): WorkflowResult {
  const { bloodGroup, location, units, urgency } = state.values;
  const locale = state.locale;
  const urgencyLabel = urgency === "critical"
    ? text(locale, "ক্রিটিক্যাল", "critical")
    : urgency === "urgent"
      ? text(locale, "জরুরি", "urgent")
      : text(locale, "স্বাভাবিক", "normal");
  const bloodGroupLabel = bloodGroup === "ANY"
    ? text(locale, "যেকোনো রক্তের গ্রুপ", "any blood group")
    : `${bloodGroup} ${text(locale, "রক্ত", "blood")}`;
  const reply = text(
    locale,
    `আপনার রক্তের রিকোয়েস্টের তথ্য পেয়েছি: ${bloodGroupLabel}, ${location}-এ ${units} ইউনিট, জরুরিতার মাত্রা ${urgencyLabel}।\n\nঅনুগ্রহ করে /request পেজ থেকে অফিসিয়াল রিকোয়েস্টটি জমা দিন, যাতে আমাদের সমন্বয়করা ব্যবস্থা নিতে পারেন। মনে রাখবেন, চ্যাট থেকে সরাসরি রিকোয়েস্ট তৈরি করা সম্ভব নয়।`,
    `I've noted your blood request: ${bloodGroupLabel}, ${units} unit(s) in ${location}, urgency: ${urgencyLabel}.\n\nPlease submit the official request from the Request Blood page at /request so our coordinators can act on it. Note that I cannot create the request directly from chat.`,
  );
  return { reply, state: null };
}

function howToBecomeDonorResult(locale: AssistantLanguage): WorkflowResult {
  const reply = text(
    locale,
    "রক্তদাতা হতে আপনাকে স্বাগতম! সাধারণ রক্তদানের শর্ত: বয়স ১৮-৬০ বছর, ওজন কমপক্ষে ৫০ কেজি, সুস্থ থাকা এবং শেষ রক্তদানের পর পর্যাপ্ত সময় পেরিয়ে যাওয়া (whole blood ৯০ দিন, plasma ৩০ দিন, platelets ১৪ দিন)। রক্তদাতা হিসেবে নিবন্ধন করতে /register পেজে গিয়ে ফর্মটি পূরণ করুন। চূড়ান্ত অনুমোদনের জন্য রক্তদানকেন্দ্রে স্বাস্থ্য পরীক্ষা ও চিকিৎসকের মূল্যায়ন করা হবে।",
    "Welcome! To become a blood donor you generally need to: be between 18 and 60 years old, weigh at least 50 kg, be in good health, and have waited long enough since your last donation (90 days for whole blood, 30 days for plasma, 14 days for platelets). Please register at the /register page and fill out the form. A blood-bank health screening and medical assessment will be done before you donate.",
  );
  return { reply, state: null };
}

export function advanceAssistantWorkflow(
  message: string,
  state: AssistantWorkflowState | null,
): WorkflowResult {
  const locale = state?.locale ?? detectAssistantLanguage(message);
  const trimmed = message.trim();

  if (state && /^(cancel|stop|exit|nevermind|never mind|reset|বাতিল|থাম|বন্ধ)$/i.test(trimmed)) {
    const reply = text(locale, "ঠিক আছে, আমি বাতিল করেছি। অন্য কিছু জানতে চাইলে বলুন।", "Okay, I've cancelled that. Feel free to ask me something else.");
    return { reply, state: null };
  }

  if (!state) {
    if (isHowToBecomeDonor(trimmed)) {
      return howToBecomeDonorResult(locale);
    }
    if (isEligibilityStart(trimmed)) {
      const next = startState("eligibility", "age", locale);
      return { reply: askFor("age", locale), state: next };
    }
    if (isTrackingStart(trimmed)) {
      const next = startState("track_request", "trackingCode", locale);
      return { reply: askFor("trackingCode", locale), state: next };
    }
    if (isRequestStart(trimmed)) {
      const bloodGroup = getBloodGroup(trimmed);
      const next = startState("request_guidance", bloodGroup ? "location" : "bloodGroup", locale, bloodGroup ? { bloodGroup } : {});
      return { reply: askFor(next.pendingField, locale), state: next };
    }
    if (isBloodNeed(trimmed)) {
      const bloodGroup = getBloodGroup(trimmed);
      const next = startState("donor_search", bloodGroup ? "location" : "bloodGroup", locale, bloodGroup ? { bloodGroup } : {});
      return { reply: askFor(next.pendingField, locale), state: next, needsLocationPermission: bloodGroup ? isNearMe(trimmed) : false };
    }
    return { reply: "", state: null };
  }

  if (state.flow === "eligibility") {
    if (state.pendingField === "age") {
      const age = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(age) || age < 1 || age > 120) return { reply: askFor("age", locale), state };
      const next = { ...state, pendingField: "weight" as const, values: { ...state.values, age } };
      return { reply: askFor("weight", locale), state: next };
    }
    if (state.pendingField === "weight") {
      const weight = Number.parseFloat(trimmed.replace(/kg|কেজি/gi, "").trim());
      if (!Number.isFinite(weight) || weight < 1 || weight > 400) return { reply: askFor("weight", locale), state };
      const next = { ...state, pendingField: "chronicIllness" as const, values: { ...state.values, weight } };
      return { reply: askFor("chronicIllness", locale), state: next };
    }
    if (state.pendingField === "chronicIllness") {
      if (!isYes(trimmed) && !isNo(trimmed)) return { reply: askFor("chronicIllness", locale), state };
      const next = { ...state, pendingField: "previousDonation" as const, values: { ...state.values, chronicIllness: isYes(trimmed) } };
      return { reply: askFor("previousDonation", locale), state: next };
    }
    if (state.pendingField === "previousDonation") {
      if (!isYes(trimmed) && !isNo(trimmed)) return { reply: askFor("previousDonation", locale), state };
      if (isNo(trimmed)) return eligibilityResult({ ...state, values: { ...state.values, previousDonation: false } });
      const next = { ...state, pendingField: "donationType" as const, values: { ...state.values, previousDonation: true } };
      return { reply: askFor("donationType", locale), state: next };
    }
    if (state.pendingField === "donationType") {
      const donationType = parseDonationType(trimmed);
      if (!donationType) return { reply: askFor("donationType", locale), state };
      const next = { ...state, pendingField: "donationDate" as const, values: { ...state.values, donationType } };
      return { reply: askFor("donationDate", locale), state: next };
    }
    if (!isDate(trimmed)) return { reply: askFor("donationDate", locale), state };
    return eligibilityResult({ ...state, values: { ...state.values, donationDate: trimmed } });
  }

  if (state.flow === "donor_search") {
    if (state.pendingField === "bloodGroup") {
      const bloodGroup = getBloodGroup(trimmed);
      if (!bloodGroup) return { reply: askFor("bloodGroup", locale), state };
      const next = { ...state, pendingField: "location" as const, values: { ...state.values, bloodGroup } };
      return { reply: askFor("location", locale), state: next, needsLocationPermission: isNearMe(trimmed) };
    }
    if (state.pendingField === "location") {
      if (!trimmed) return { reply: askFor("location", locale), state };

      // "near me" / "আমার কাছে" — use the device location, no name needed.
      if (isNearMe(trimmed)) {
        return {
          reply: "",
          state: { ...state, values: { ...state.values, location: trimmed } },
          shouldSearchDonors: true,
          needsLocationPermission: true,
        };
      }

      const area = resolveArea(trimmed);
      if (!area) {
        // Do not search a place that does not exist — that used to
        // produce a misleading "0 donors found near you" answer.
        return { reply: askForUnknownArea(locale), state };
      }

      return {
        reply: "",
        state: {
          ...state,
          values: {
            ...state.values,
            location: trimmed,
            district: area.district,
            upazila: area.upazila,
          },
        },
        shouldSearchDonors: true,
      };
    }
  }

  if (state.flow === "track_request") {
    if (!/^TBB-\d{4}-[A-Z0-9]+$/i.test(trimmed)) return { reply: askFor("trackingCode", locale), state };
    return { reply: "", state: { ...state, values: { ...state.values } }, shouldTrackRequest: true };
  }

  if (state.flow === "request_guidance") {
    if (state.pendingField === "bloodGroup") {
      const bloodGroup = getBloodGroup(trimmed);
      if (!bloodGroup) return { reply: askFor("bloodGroup", locale), state };
      const next = { ...state, pendingField: "location" as const, values: { ...state.values, bloodGroup } };
      return { reply: askFor("location", locale), state: next };
    }
    if (state.pendingField === "location") {
      if (!trimmed) return { reply: askFor("location", locale), state };
      const area = resolveArea(trimmed);
      if (!area) return { reply: askForUnknownArea(locale), state };
      const next = {
        ...state,
        pendingField: "units" as const,
        values: {
          ...state.values,
          location: trimmed,
          district: area.district,
          upazila: area.upazila,
        },
      };
      return { reply: askFor("units", locale), state: next };
    }
    if (state.pendingField === "units") {
      const units = Number.parseInt(trimmed.replace(/unit|units|ইউনিট/gi, "").trim(), 10);
      if (!Number.isFinite(units) || units < 1 || units > 20) return { reply: askFor("units", locale), state };
      const next = { ...state, pendingField: "urgency" as const, values: { ...state.values, units } };
      return { reply: askFor("urgency", locale), state: next };
    }
    const urgency = parseUrgency(trimmed);
    if (!urgency) return { reply: askFor("urgency", locale), state };
    return requestGuidanceResult({ ...state, values: { ...state.values, urgency } });
  }

  return { reply: "", state: null };
}
