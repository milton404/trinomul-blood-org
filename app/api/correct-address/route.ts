/**
 * POST /api/correct-address
 *
 * AI-powered address correction endpoint. Uses a two-tier provider chain:
 *   1. DeepSeek (primary — cheap, strong reasoning)
 *   2. Zhipu GLM (fallback — free tier, strong multilingual)
 *
 * If both fail, returns null so the client can use rule-based correction.
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

const SYSTEM_PROMPT =
  "You correct Bangladeshi place names for geocoding. Output ONLY the corrected name, nothing else.";

function buildPrompt(query: string): string {
  return `You are a location name corrector for Rangpur Division, Bangladesh.

The user typed a place name that might have typos, incomplete names, or mixed Bangla/English. Your job is to output ONLY the corrected, complete place name in English that would work with Nominatim/OpenStreetMap search.

Rules:
- Fix spellings: "Rongpur" → "Rangpur", "Dinnajpur" → "Dinajpur"
- Add "Rangpur" or the district name if the query is too short
- Output ONLY the corrected place name, nothing else
- If you can't understand the query, output the original

Examples:
- "rongpur mediacl" → "Rangpur Medical College"
- "dhaka" → "Dhaka, Bangladesh"
- "saidpur" → "Saidpur, Nilphamari, Rangpur"
- "asdfg" → "asdfg"

Query: "${query}"`;
}

// ── DeepSeek ──
async function deepseekCorrect(query: string): Promise<string | null> {
  if (!DEEPSEEK_API_KEY) return null;

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(query) },
      ],
      max_tokens: 100,
      temperature: 0.1,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// ── Zhipu GLM ──
async function zhipuCorrect(query: string): Promise<string | null> {
  if (!ZHIPU_API_KEY) return null;

  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(query) },
      ],
      max_tokens: 100,
      temperature: 0.1,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// ── Route handler ──
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return Response.json({ corrected: null });
    }

    const trimmed = query.trim();

    // Tier 1: DeepSeek
    try {
      const result = await deepseekCorrect(trimmed);
      if (result) return Response.json({ corrected: result });
    } catch {
      // DeepSeek failed — fall through to Zhipu
    }

    // Tier 2: Zhipu GLM
    try {
      const result = await zhipuCorrect(trimmed);
      if (result) return Response.json({ corrected: result });
    } catch {
      // Zhipu failed — return null, client will use rule-based
    }

    return Response.json({ corrected: null });
  } catch {
    return Response.json({ corrected: null });
  }
}
