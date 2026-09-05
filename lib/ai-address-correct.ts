/**
 * AI-powered address correction.
 *
 * When Nominatim returns 0 results for a user-typed query, this module uses
 * AI to correct misspellings, add missing context (district/division), and
 * standardize Bangla/English transliterations so the corrected query can be
 * re-submitted to Nominatim with a high chance of success.
 *
 * Provider chain: DeepSeek (primary) → Zhipu GLM (fallback) → rule-based.
 * API keys live server-side only — the client calls /api/correct-address.
 * If all AI providers fail, the function degrades gracefully to heuristics.
 */

// --------------- AI-powered correction ---------------

/**
 * Use AI to correct a potentially misspelled or incomplete address query.
 * Returns the corrected query string, or null if correction is unavailable.
 *
 * Calls the server-side /api/correct-address endpoint which chains:
 *   DeepSeek → Zhipu GLM → no result
 * Falls back to rule-based heuristics on network / server errors.
 */
export async function correctAddress(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return null;

  // Try server-side AI correction (DeepSeek → Zhipu)
  try {
    const res = await fetch("/api/correct-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.corrected) return data.corrected as string;
    }
  } catch {
    // API unreachable — fall through to heuristics
  }

  // Fallback: rule-based normalization
  return heuristicCorrect(trimmed);
}

// --------------- Rule-based fallback correction ---------------

/**
 * Common misspelling corrections for Rangpur division places.
 * Key = common typo/misspelling, Value = correct version.
 */
const SPELLING_FIXES: Record<string, string> = {
  rongpur: "Rangpur",
  rongpoor: "Rangpur",
  rangpoor: "Rangpur",
  dinnajpur: "Dinajpur",
  dinajpoor: "Dinajpur",
  nillphamari: "Nilphamari",
  nilfamari: "Nilphamari",
  lalmonirhat: "Lalmonirhat",
  lalmonihat: "Lalmonirhat",
  kurigram: "Kurigram",
  kurigam: "Kurigram",
  gaibandha: "Gaibandha",
  gaibanda: "Gaibandha",
  thakurgaon: "Thakurgaon",
  thakurgram: "Thakurgaon",
  panchagarh: "Panchagarh",
  panchagor: "Panchagarh",
  mediacl: "Medical",
  hospitel: "Hospital",
  hospetal: "Hospital",
  coleg: "College",
  colage: "College",
};

/**
 * Rangpur division districts — used to auto-append context.
 */
const RANGPUR_DISTRICTS = [
  "Rangpur",
  "Dinajpur",
  "Kurigram",
  "Gaibandha",
  "Lalmonirhat",
  "Nilphamari",
  "Panchagarh",
  "Thakurgaon",
];

function heuristicCorrect(query: string): string | null {
  let corrected = query.toLowerCase().trim();

  // Apply spelling fixes
  for (const [wrong, right] of Object.entries(SPELLING_FIXES)) {
    corrected = corrected.replace(new RegExp(wrong, "gi"), right);
  }

  // Title-case each word
  corrected = corrected
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // If the query is very short (< 5 chars), it's likely a search for a
  // district name — add "District, Rangpur Division, Bangladesh"
  const isShort = query.trim().length < 5;
  if (isShort) {
    const matchedDistrict = RANGPUR_DISTRICTS.find(
      (d) => corrected.toLowerCase().includes(d.toLowerCase()),
    );
    if (matchedDistrict) {
      corrected = `${matchedDistrict} District, Rangpur Division, Bangladesh`;
    }
  }

  // If no districts are mentioned at all, append "Rangpur" for context
  const hasDistrictContext = RANGPUR_DISTRICTS.some(
    (d) => corrected.toLowerCase().includes(d.toLowerCase()),
  );
  if (!hasDistrictContext && corrected.length > 3) {
    corrected = `${corrected}, Rangpur, Bangladesh`;
  }

  return corrected !== query.trim() ? corrected : null;
}
