/**
 * Blood group parser — detects blood group mentions in free-text search queries
 * and strips them out so the remaining text can be used for geocoding.
 *
 * Supports:
 *   - Standard notation:  A+, B-, AB+, O-, etc.
 *   - Word forms:         "A positive", "B negative", "AB pos"
 *   - Mixed with location: "A+ donors near Rangpur Medical"
 */

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

/**
 * Normalized alias map — word-form blood group → standard notation.
 * Keys are lowercased for case-insensitive matching.
 */
const ALIAS_TO_STANDARD: Record<string, BloodGroup> = {
  "a positive": "A+",
  "a pos": "A+",
  "a +ve": "A+",
  "a+ve": "A+",
  "a negative": "A-",
  "a neg": "A-",
  "a -ve": "A-",
  "a-ve": "A-",
  "ab positive": "AB+",
  "ab pos": "AB+",
  "ab +ve": "AB+",
  "ab+ve": "AB+",
  "ab negative": "AB-",
  "ab neg": "AB-",
  "ab -ve": "AB-",
  "ab-ve": "AB-",
  "b positive": "B+",
  "b pos": "B+",
  "b +ve": "B+",
  "b+ve": "B+",
  "b negative": "B-",
  "b neg": "B-",
  "b -ve": "B-",
  "b-ve": "B-",
  "o positive": "O+",
  "o pos": "O+",
  "o +ve": "O+",
  "o+ve": "O+",
  "o negative": "O-",
  "o neg": "O-",
  "o -ve": "O-",
  "o-ve": "O-",

  // Bengali blood group shorthand
  "এ+": "A+",
  "এ-": "A-",
  "বি+": "B+",
  "বি-": "B-",
  "এবি+": "AB+",
  "এবি-": "AB-",
  "ও+": "O+",
  "ও-": "O-",
};

/**
 * Standard notation regex — matches A+, B-, AB+, O- etc.
 * Word-boundary constrained to avoid false positives like "A+ grade".
 */
const STANDARD_REGEX = /\b(AB?[+-]|O[+-])\b/gi;

/**
 * Word-form regex — matches patterns like "A positive", "AB negative", "O+ve"
 * within a bounded context (max 4 words to avoid huge false positives).
 */
const WORD_FORM_REGEX = /\b(A|B|AB|O)\s*(positive|negative|pos|neg|[+-]ve)\b/gi;

export interface ParsedQuery {
  /** Detected blood group in standard notation, e.g. "A+" — or null */
  bloodGroup: BloodGroup | null;
  /** Cleaned location query with the blood group portion removed */
  locationQuery: string;
}

/**
 * Extract a blood group from a search query, returning the standard-notation
 * blood group and the remaining location text.
 *
 * If no blood group is found, `bloodGroup` is null and `locationQuery` is the
 * original input trimmed.
 */
export function parseBloodGroupQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  if (!trimmed) return { bloodGroup: null, locationQuery: trimmed };

  // 1. Try standard notation first (fast regex)
  const stdMatch = trimmed.match(STANDARD_REGEX);
  if (stdMatch) {
    const bg = normalizeBloodGroup(stdMatch[0]);
    if (bg) {
      const cleaned = removeMatch(trimmed, stdMatch[0]);
      return { bloodGroup: bg, locationQuery: cleaned };
    }
  }

  // 2. Try word-form patterns
  const wordMatch = WORD_FORM_REGEX.exec(trimmed);
  WORD_FORM_REGEX.lastIndex = 0; // reset
  if (wordMatch) {
    const key = wordMatch[0].toLowerCase().replace(/\s+/g, " ").trim();
    const bg = ALIAS_TO_STANDARD[key];
    if (bg) {
      const cleaned = removeMatch(trimmed, wordMatch[0]);
      return { bloodGroup: bg, locationQuery: cleaned };
    }
  }

  // 3. Try full alias matching (for Bengali etc. which regex won't catch)
  const lower = trimmed.toLowerCase();
  for (const [alias, bg] of Object.entries(ALIAS_TO_STANDARD)) {
    if (lower.includes(alias)) {
      const cleaned = removeMatch(trimmed, alias);
      return { bloodGroup: bg, locationQuery: cleaned };
    }
  }

  return { bloodGroup: null, locationQuery: trimmed };
}

/**
 * Normalize a raw blood group string (already matched) to standard notation.
 */
export function normalizeBloodGroup(raw: string): BloodGroup | null {
  const upper = raw.toUpperCase().trim();
  if ((BLOOD_GROUPS as readonly string[]).includes(upper)) {
    return upper as BloodGroup;
  }

  // Try alias
  const lower = raw.toLowerCase().trim();
  return ALIAS_TO_STANDARD[lower] ?? null;
}

/**
 * Check if a string is a valid blood group in standard notation.
 */
export function isValidBloodGroup(value: string): value is BloodGroup {
  return (BLOOD_GROUPS as readonly string[]).includes(value.toUpperCase());
}

/**
 * Remove the first occurrence of `match` from `text` and clean up
 * trailing/leading spaces, double spaces, and leftover connector words
 * like "near", "in", "at", "donors".
 */
function removeMatch(text: string, match: string): string {
  const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");

  let cleaned = text.replace(re, "");

  // Remove connector/context words that are now meaningless without the blood group
  cleaned = cleaned
    .replace(/\bdonors?\b/gi, "")
    .replace(/\bblood\b/gi, "")
    .replace(/\bgroup\b/gi, "")
    .replace(/\bfor\b/gi, "")
    .replace(/\bnear\b/gi, "")
    .replace(/\bat\b/gi, "")
    .replace(/\bin\b/gi, "")
    .replace(/\bthe\b/gi, "")
    .replace(/\bof\b/gi, "");
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  // Remove leading/trailing punctuation/commas after cleaning
  cleaned = cleaned.replace(/^[\s,.-]+/, "").replace(/[\s,.-]+$/, "");

  return cleaned || text.trim();
}
