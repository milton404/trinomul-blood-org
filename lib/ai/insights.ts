"use server";

/**
 * Phase 4.1: AI-Powered Donor Insights
 *
 * Server-only module that uses DeepSeek (primary) and Zhipu GLM (fallback)
 * to generate insights from aggregated blood bank data. Both providers
 * expose OpenAI-compatible Chat Completions APIs, so a single fetch-based
 * client handles both. Falls back to rule-based insights when no API key
 * is configured so the app never breaks in development.
 *
 * Provider chain:
 *  1. DeepSeek (deepseek-chat) — if DEEPSEEK_API_KEY is set
 *  2. Zhipu (glm-4-flash)      — if ZHIPU_API_KEY is set
 *  3. Rule-based fallback       — always available
 *
 * Insight categories:
 *  - Predictive demand forecasting
 *  - Donor retention insights
 *  - Anomaly detection
 *  - Smart camp scheduling
 *  - Natural language admin queries
 */

import {
  getPublicTransparencyStats,
  getDonationImpactStats,
  getDashboardStats,
  getMonthlyStats,
  getDistrictStats,
  getBloodInventory,
  getAllBloodRequests,
  getAllDonations,
  getProfilesByRole,
} from "@/lib/db";
import {
  callLLM,
  extractJSON,
  getActiveProvider,
  type AIProvider,
  type LLMResult,
  type ProviderConfig,
} from "./providers";

// Re-export shared types and utilities for backward compatibility
export {
  callLLM,
  extractJSON,
  getActiveProvider,
  type AIProvider,
  type LLMResult,
  type ProviderConfig,
};

// ── Types ───────────────────────────────────────────────────────────

export interface AIInsight {
  id: string;
  category:
    | "demand_forecast"
    | "donor_retention"
    | "anomaly_detection"
    | "camp_scheduling"
    | "operational";
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  description: string;
  recommendation?: string;
  metrics?: Record<string, number | string>;
  createdAt: string;
}

export interface AISummary {
  insights: AIInsight[];
  generatedAt: string;
  usingAI: boolean;
  provider: AIProvider;
  summary: string;
}

export interface NLQueryResult {
  question: string;
  answer: string;
  usingAI: boolean;
  provider: AIProvider;
  dataContext?: string;
}

// ── DB context builder ──────────────────────────────────────────────

interface DBContext {
  transparency: ReturnType<typeof getPublicTransparencyStats>;
  impact: ReturnType<typeof getDonationImpactStats>;
  dashboard: ReturnType<typeof getDashboardStats>;
  monthly: ReturnType<typeof getMonthlyStats>;
  district: ReturnType<typeof getDistrictStats>;
  inventory: ReturnType<typeof getBloodInventory>;
  totalRequests: number;
  totalDonations: number;
  donorCount: number;
  hospitalCount: number;
}

function buildDBContext(): DBContext {
  return {
    transparency: getPublicTransparencyStats(),
    impact: getDonationImpactStats(),
    dashboard: getDashboardStats(),
    monthly: getMonthlyStats(),
    district: getDistrictStats(),
    inventory: getBloodInventory(),
    totalRequests: getAllBloodRequests().length,
    totalDonations: getAllDonations().length,
    donorCount: getProfilesByRole("donor").length,
    hospitalCount: getProfilesByRole("hospital").length,
  };
}

function contextToText(ctx: DBContext): string {
  const inv = ctx.inventory
    .map((i: any) => `${i.blood_group}:${i.count}`)
    .join(", ");
  const districts = ctx.district
    .map(
      (d: any) =>
        `${d.district}(donors:${d.donors ?? d.donor_count}, requests:${d.requests})`,
    )
    .join(", ");
  const months = ctx.monthly
    .map((m: any) => `${m.month}(req:${m.requests}, donors:${m.donors})`)
    .join(", ");

  return [
    `Total donors: ${ctx.donorCount}`,
    `Total hospitals: ${ctx.hospitalCount}`,
    `Total blood requests: ${ctx.totalRequests}`,
    `Total donations: ${ctx.totalDonations}`,
    `Active requests: ${ctx.transparency.activeRequests}`,
    `Fulfilled requests: ${ctx.transparency.fulfilledRequests}`,
    `Fulfillment rate: ${ctx.transparency.fulfillmentRate}%`,
    `Lives saved (units): ${ctx.transparency.totalUnits}`,
    `Districts covered: ${ctx.transparency.districtsCovered}`,
    `Blood inventory: ${inv}`,
    `Districts breakdown: ${districts}`,
    `Monthly trends: ${months}`,
  ].join("\n");
}

// ── Insight generation ──────────────────────────────────────────────

const INSIGHT_PROMPT = `You are an AI analyst for a blood bank management system in Rangpur, Bangladesh.
Analyze the following database context and generate actionable insights.

__CONTEXT__

Return a JSON object with this exact structure:
{
  "summary": "A brief 1-2 sentence overview of the current situation",
  "insights": [
    {
      "category": "one of: inventory_monitoring, donor_engagement, anomaly_detection, operational, predictive",
      "severity": "one of: info, warning, critical, success",
      "title": "Short insight title",
      "description": "Detailed description of the finding",
      "recommendation": "Specific actionable recommendation"
    }
  ]
}

Generate 3-7 insights focusing on: blood inventory levels, donor availability, urgent requests, fulfillment rates, district coverage gaps, and trends. Prioritize critical issues first. Be specific with numbers from the context.`;

/**
 * Generate a comprehensive set of AI insights from current DB state.
 * Uses DeepSeek (primary) or Zhipu (fallback); falls back to rules.
 */
export async function generateAIInsights(): Promise<AISummary> {
  const ctx = buildDBContext();
  const activeProvider = getActiveProvider();

  let insights: AIInsight[] = [];
  let summary = "";
  let provider: AIProvider = "rules";

  if (activeProvider) {
    const prompt = INSIGHT_PROMPT.replace("__CONTEXT__", contextToText(ctx));
    const result = await callLLM(prompt, { jsonMode: true, temperature: 0.4, maxTokens: 2000 });

    if (result) {
      try {
        // Extract JSON from response (handles markdown code fences)
        const jsonText = extractJSON(result.text);
        const parsed = JSON.parse(jsonText) as {
          summary?: string;
          insights?: any[];
        };
        summary = parsed.summary ?? "";
        insights = (parsed.insights ?? []).map((ins: any, idx: number) => ({
          id: `ai-${idx}`,
          category: (ins.category ?? "operational") as AIInsight["category"],
          severity: (ins.severity ?? "info") as AIInsight["severity"],
          title: ins.title ?? "Insight",
          description: ins.description ?? "",
          recommendation: ins.recommendation,
          createdAt: new Date().toISOString(),
        }));
        provider = result.provider;
      } catch (err) {
        console.warn(`[${result.provider}] Failed to parse insight JSON:`, err);
        insights = buildRuleBasedInsights(ctx);
        summary = "AI response parse error — showing rule-based insights.";
      }
    } else {
      insights = buildRuleBasedInsights(ctx);
      summary = "AI services unavailable — showing rule-based insights.";
    }
  } else {
    insights = buildRuleBasedInsights(ctx);
    summary =
      "No AI API key configured — showing rule-based insights. Set DEEPSEEK_API_KEY or ZHIPU_API_KEY to enable AI.";
  }

  return {
    insights,
    generatedAt: new Date().toISOString(),
    usingAI: provider !== "rules",
    provider,
    summary,
  };
}

// ── Rule-based fallback insights ────────────────────────────────────

function buildRuleBasedInsights(ctx: DBContext): AIInsight[] {
  const out: AIInsight[] = [];
  const now = new Date().toISOString();

  // 1. Low inventory alert
  const lowStock = ctx.inventory.filter((i: any) => i.count > 0 && i.count < 5);
  const zeroStock = ctx.inventory.filter((i: any) => i.count === 0);
  if (zeroStock.length > 0) {
    out.push({
      id: "rule-zero-stock",
      category: "anomaly_detection",
      severity: "critical",
      title: "Blood groups out of stock",
      description: `${zeroStock.map((i: any) => i.blood_group).join(", ")} have no donors available. These groups cannot fulfill incoming requests.`,
      recommendation: `Launch an urgent donor drive for ${zeroStock.map((i: any) => i.blood_group).join(", ")} donors.`,
      metrics: { zeroStockGroups: zeroStock.length },
      createdAt: now,
    });
  }
  if (lowStock.length > 0) {
    out.push({
      id: "rule-low-stock",
      category: "anomaly_detection",
      severity: "warning",
      title: "Low blood inventory",
      description: `${lowStock.map((i: any) => i.blood_group).join(", ")} have fewer than 5 active donors.`,
      recommendation: "Send re-engagement SMS to lapsed donors of these groups.",
      metrics: { lowStockGroups: lowStock.length },
      createdAt: now,
    });
  }

  // 2. Fulfillment rate
  const rate = ctx.transparency.fulfillmentRate;
  if (rate < 50 && ctx.transparency.totalRequests > 5) {
    out.push({
      id: "rule-low-fulfillment",
      category: "operational",
      severity: "warning",
      title: "Low fulfillment rate",
      description: `Only ${rate}% of blood requests are being fulfilled. Target is 70%+.`,
      recommendation: "Review bottleneck districts and expand donor outreach.",
      metrics: { fulfillmentRate: rate },
      createdAt: now,
    });
  } else if (rate >= 70) {
    out.push({
      id: "rule-good-fulfillment",
      category: "operational",
      severity: "success",
      title: "Healthy fulfillment rate",
      description: `Fulfillment rate is ${rate}%, above the 70% target.`,
      recommendation: "Maintain current donor engagement levels.",
      metrics: { fulfillmentRate: rate },
      createdAt: now,
    });
  }

  // 3. Demand forecast — high active request volume
  if (ctx.transparency.activeRequests > 10) {
    out.push({
      id: "rule-high-demand",
      category: "demand_forecast",
      severity: "warning",
      title: "High active request volume",
      description: `${ctx.transparency.activeRequests} active requests currently open. Demand is elevated.`,
      recommendation: "Pre-notify compatible donors for anticipated urgent needs.",
      metrics: { activeRequests: ctx.transparency.activeRequests },
      createdAt: now,
    });
  }

  // 4. Donor retention — donations per donor
  const avg = ctx.impact.avgDonationsPerDonor;
  if (avg < 1.5 && ctx.donorCount > 10) {
    out.push({
      id: "rule-low-retention",
      category: "donor_retention",
      severity: "info",
      title: "Low repeat donation rate",
      description: `Average donations per donor is ${avg}. Most donors donate only once.`,
      recommendation: "Send 'you're eligible again' SMS reminders to past donors.",
      metrics: { avgDonationsPerDonor: avg },
      createdAt: now,
    });
  }

  // 5. Camp scheduling — district with most donors
  const topDistrict = ctx.district
    .slice()
    .sort(
      (a: any, b: any) =>
        (b.donors ?? b.donor_count ?? 0) - (a.donors ?? a.donor_count ?? 0),
    )[0];
  if (topDistrict) {
    const count = topDistrict.donors ?? topDistrict.donor_count ?? 0;
    out.push({
      id: "rule-camp-suggest",
      category: "camp_scheduling",
      severity: "info",
      title: "Suggested camp location",
      description: `${topDistrict.district} has the highest donor density (${count} donors). A camp here could yield high turnout.`,
      recommendation: `Schedule next blood donation camp in ${topDistrict.district}.`,
      metrics: { district: topDistrict.district, donorCount: count },
      createdAt: now,
    });
  }

  return out;
}

// ── Natural language admin query ────────────────────────────────────

const NL_PROMPT = `You are an AI assistant for a blood bank management system in Rangpur, Bangladesh.
Answer the admin's question based on the following database context. Be concise and specific.

Database Context:
__CONTEXT__

Admin=Question: __QUESTION__

Provide a clear, factual answer using the data above. If the question asks about counts, give exact numbers. If it asks about trends, describe the direction. If the data doesn't contain the answer, say so.`;

/**
 * Answer a natural-language admin question by feeding DB context to the AI.
 * Falls back to a simple keyword search when no AI provider is available.
 */
export async function askNaturalLanguageQuery(
  question: string,
): Promise<NLQueryResult> {
  const ctx = buildDBContext();
  const activeProvider = getActiveProvider();

  if (!activeProvider) {
    return {
      question,
      answer: answerFromRules(question, ctx),
      usingAI: false,
      provider: "rules",
      dataContext: "Rule-based answer (no AI API key configured)",
    };
  }

  const prompt = NL_PROMPT.replace("__CONTEXT__", contextToText(ctx)).replace(
    "__QUESTION__",
    question,
  );
  const result = await callLLM(prompt, { temperature: 0.5, maxTokens: 1500 });

  if (!result) {
    return {
      question,
      answer: answerFromRules(question, ctx),
      usingAI: false,
      provider: "rules",
      dataContext: "Fallback rule-based answer (AI services unavailable)",
    };
  }

  return {
    question,
    answer: result.text.trim() || "No answer generated.",
    usingAI: true,
    provider: result.provider,
    dataContext: "Sourced from live database aggregates",
  };
}

function answerFromRules(question: string, ctx: DBContext): string {
  const q = question.toLowerCase();
  if (q.includes("o+") || q.includes("o-") || q.includes("a+") || q.includes("a-") ||
      q.includes("b+") || q.includes("b-") || q.includes("ab+") || q.includes("ab-")) {
    const bg = q.match(/[ab][+-]|o[+-]|ab[+-]/)?.[0]?.toUpperCase();
    if (bg) {
      const item = ctx.inventory.find((i: any) => i.blood_group === bg);
      return item
        ? `There are ${item.count} ${bg} donors currently available in the system.`
        : `${bg} inventory data not found.`;
    }
  }
  if (q.includes("donor") && q.includes("how many")) {
    return `There are ${ctx.donorCount} registered donors in total.`;
  }
  if (q.includes("active") && q.includes("request")) {
    return `There are ${ctx.transparency.activeRequests} active blood requests.`;
  }
  if (q.includes("fulfill") || q.includes("success rate")) {
    return `Fulfillment rate is ${ctx.transparency.fulfillmentRate}% (${ctx.transparency.fulfilledRequests}/${ctx.transparency.totalRequests}).`;
  }
  if (q.includes("district") && q.includes("donor")) {
    const top = ctx.district[0];
    return top
      ? `${top.district} has the most donors (${top.donors ?? top.donor_count}).`
      : "No district data available.";
  }
  return `I can answer questions about donor counts, blood inventory, active requests, fulfillment rates, and district-level stats. Configure DEEPSEEK_API_KEY or ZHIPU_API_KEY for full natural language support.`;
}

// ── Lightweight summary for dashboard card ──────────────────────────

export interface DashboardAISnapshot {
  topInsight: AIInsight | null;
  criticalCount: number;
  warningCount: number;
  usingAI: boolean;
  provider: AIProvider;
  summary: string;
}

/**
 * Returns a compact snapshot for the admin dashboard AI card.
 * Cached for 10 minutes per process to avoid regenerating on every load.
 */
let snapshotCache: { at: number; data: DashboardAISnapshot } | null = null;
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export async function getDashboardAISnapshot(): Promise<DashboardAISnapshot> {
  if (snapshotCache && Date.now() - snapshotCache.at < SNAPSHOT_TTL_MS) {
    return snapshotCache.data;
  }
  const full = await generateAIInsights();
  const critical = full.insights.filter((i) => i.severity === "critical");
  const warning = full.insights.filter((i) => i.severity === "warning");
  const top = critical[0] ?? warning[0] ?? full.insights[0] ?? null;
  const data: DashboardAISnapshot = {
    topInsight: top,
    criticalCount: critical.length,
    warningCount: warning.length,
    usingAI: full.usingAI,
    provider: full.provider,
    summary: full.summary,
  };
  snapshotCache = { at: Date.now(), data };
  return data;
}
