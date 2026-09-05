/**
 * Shared AI provider configuration and LLM client.
 *
 * This module has NO "use server" directive so it can export both
 * sync and async functions. It is imported by server-only modules
 * (insights.ts, user-assistant.ts) which do have "use server".
 *
 * Provider chain (tried in order):
 *  1. DeepSeek V4-Flash          — primary (fast, cheap: ~$0.22/M in, $0.66/M out)
 *  2. Zhipu GLM-4-Flash          — FREE fallback
 *  3. Rule-based fallback        — handled by callers (regex + DB search)
 */

// ── Types ───────────────────────────────────────────────────────────

export type AIProvider = "deepseek" | "zhipu" | "rules";

export interface ProviderConfig {
  name: Exclude<AIProvider, "rules">;
  apiKey: string;
  url: string;
  model: string;
}

export interface LLMResult {
  text: string;
  provider: Exclude<AIProvider, "rules">;
}

export interface LLMCallOptions {
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
}

// ── Provider configuration ──────────────────────────────────────────
const PROVIDERS: ProviderConfig[] = [
  {
    name: "deepseek",
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    url: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-v4-flash",
  },
  {
    name: "zhipu",
    apiKey: process.env.ZHIPU_API_KEY ?? "",
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4-flash",
  },
];

/**
 * Returns the first provider with a configured API key, or null.
 */
export function getActiveProvider(): ProviderConfig | null {
  for (const p of PROVIDERS) {
    if (p.apiKey) return p;
  }
  return null;
}

// ── Unified LLM call (OpenAI-compatible) ────────────────────────────

/**
 * Call the active LLM provider with proper system + user message roles.
 * If the primary provider fails, tries the next configured provider.
 *
 * @param prompt  The user prompt to send.
 * @param options Optional: jsonMode, temperature, maxTokens, systemPrompt, timeoutMs
 */
export async function callLLM(
  prompt: string,
  optionsOrJsonMode?: boolean | LLMCallOptions,
): Promise<LLMResult | null> {
  const opts: LLMCallOptions =
    typeof optionsOrJsonMode === "boolean"
      ? { jsonMode: optionsOrJsonMode }
      : (optionsOrJsonMode ?? {});

  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 2000;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const tried = new Set<string>();

  for (const p of PROVIDERS) {
    if (!p.apiKey || tried.has(p.name)) continue;
    tried.add(p.name);

    try {
      const messages: { role: string; content: string }[] = [];
      if (opts.systemPrompt) {
        messages.push({ role: "system", content: opts.systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const body: Record<string, unknown> = {
        model: p.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };
      if (opts.jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errBody = await res.text();
        console.warn(
          `[${p.name}] LLM call failed: HTTP ${res.status} — ${errBody.slice(0, 200)}`,
        );
        continue;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        console.warn(`[${p.name}] LLM returned empty content`);
        continue;
      }
      return { text, provider: p.name };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.warn(`[${p.name}] LLM call timed out after ${timeoutMs}ms`);
      } else {
        console.warn(`[${p.name}] LLM call error:`, err);
      }
      continue;
    }
  }

  return null;
}

// ── JSON extraction helper ──────────────────────────────────────────

/**
 * Extract JSON from an LLM response that may be wrapped in markdown
 * code fences or mixed with surrounding text.
 */
export function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}
