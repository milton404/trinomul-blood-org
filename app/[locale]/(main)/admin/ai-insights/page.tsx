"use client";

import { useState, useEffect } from "react";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import { useTranslations, useLocale } from "next-intl";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Users,
  Loader2,
  Send,
  Bot,
  Info,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import {
  serverGenerateAIInsights,
  serverAskNaturalLanguageQuery,
} from "@/lib/db-actions";
import { Link } from "@/i18n/routing";

interface AIInsight {
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

interface AISummary {
  insights: AIInsight[];
  generatedAt: string;
  usingAI: boolean;
  provider: "deepseek" | "zhipu" | "rules";
  summary: string;
}

const CATEGORY_CONFIG = {
  demand_forecast: {
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  donor_retention: {
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  anomaly_detection: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  camp_scheduling: {
    icon: MapPin,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  operational: {
    icon: Info,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
} as const;

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: "text-red-700",
    bg: "bg-red-100",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-100",
    label: "Warning",
  },
  info: {
    icon: Info,
    color: "text-blue-700",
    bg: "bg-blue-100",
    label: "Info",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-700",
    bg: "bg-green-100",
    label: "Good",
  },
} as const;

export default function AIInsightsPage() {
  // Note: this page uses inline bilingual ternaries (isBn ? "বাংলা" : "English")
  // instead of the i18n catalog because the admin namespace is flat and
  // `admin.ai_insights` is a string value, not a nested object.
  useTranslations("admin");
  const locale = useLocale();
  const isBn = locale === "bn";

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<AISummary | null>(null);

  // NL query state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryUsingAI, setQueryUsingAI] = useState(false);
  const [queryProvider, setQueryProvider] = useState<string>("");
  const [queryContext, setQueryContext] = useState<string>("");

  useEffect(() => {
    fetchInsights(false);
  }, []);

  const fetchInsights = async (isRefresh: boolean) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const data = (await serverGenerateAIInsights()) as AISummary;
      setSummary(data);
    } catch (err) {
      console.error("Error fetching AI insights:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setQueryLoading(true);
    setAnswer(null);
    try {
      const result = await serverAskNaturalLanguageQuery(question.trim());
      setAnswer(result.answer);
      setQueryUsingAI(result.usingAI);
      setQueryProvider(result.provider);
      setQueryContext(result.dataContext ?? "");
    } catch (err) {
      setAnswer(
        isBn
          ? "ত্রুটি হয়েছে। আবার চেষ্টা করুন।"
          : "An error occurred. Please try again.",
      );
    } finally {
      setQueryLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <DetailPageSkeleton />
      </div>
    );
  }

  const insights = summary?.insights ?? [];
  const criticalCount = insights.filter(
    (i) => i.severity === "critical",
  ).length;
  const warningCount = insights.filter(
    (i) => i.severity === "warning",
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isBn ? "AI ইনসাইটস" : "AI Insights"}
            </h1>
            <p className="text-sm text-slate-500">
              {isBn
                ? "ডেটা-চালিত সিদ্ধান্তের জন্য বুদ্ধিমত্তা"
                : "Intelligence for data-driven decisions"}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isBn ? "রিফ্রেশ" : "Refresh"}
        </button>
      </div>

      {/* Status banner */}
      <div
        className={`p-4 rounded-2xl border ${
          summary?.usingAI
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              summary?.usingAI
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-slate-900 text-sm">
              {summary?.usingAI
                ? (summary.provider === "deepseek"
                    ? isBn ? "DeepSeek AI সক্রিয়" : "DeepSeek AI Active"
                    : summary.provider === "zhipu"
                      ? isBn ? "Zhipu GLM AI সক্রিয়" : "Zhipu GLM AI Active"
                      : isBn ? "AI সক্রিয়" : "AI Active")
                : isBn
                  ? "AI সক্রিয় নয়"
                  : "AI Inactive"}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {summary?.summary}
            </p>
            {summary?.generatedAt && (
              <p className="text-xs text-slate-400 mt-2">
                {isBn ? "তৈরি হয়েছে" : "Generated"}:{" "}
                {new Date(summary.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="text-3xl font-bold text-slate-900">
            {insights.length}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {isBn ? "মোট ইনসাইট" : "Total Insights"}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {isBn ? "সংকটজনক" : "Critical"}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="text-3xl font-bold text-amber-600">{warningCount}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {isBn ? "সতর্কতা" : "Warnings"}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100">
          <div className="text-3xl font-bold text-green-600">
            {insights.filter((i) => i.severity === "success").length}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {isBn ? "ভালো" : "Healthy"}
          </div>
        </div>
      </div>

      {/* Insights grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.length === 0 ? (
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">
              {isBn
                ? "এই মুহূর্তে কোনো ইনসাইট নেই।"
                : "No insights available at this time."}
            </p>
          </div>
        ) : (
          insights.map((insight) => {
            const catConfig =
              CATEGORY_CONFIG[insight.category] ?? CATEGORY_CONFIG.operational;
            const sevConfig =
              SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info;
            const CatIcon = catConfig.icon;
            const SevIcon = sevConfig.icon;

            return (
              <div
                key={insight.id}
                className={`bg-white rounded-3xl border ${catConfig.border} p-6 shadow-sm`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 ${catConfig.bg} rounded-xl flex items-center justify-center`}
                    >
                      <CatIcon className={`w-5 h-5 ${catConfig.color}`} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {insight.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 ${sevConfig.bg} ${sevConfig.color} rounded-full text-xs font-semibold`}
                  >
                    <SevIcon className="w-3 h-3" />
                    {sevConfig.label}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">
                  {insight.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  {insight.description}
                </p>
                {insight.recommendation && (
                  <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700">
                      {insight.recommendation}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Natural Language Query */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {isBn ? "প্রাকৃতিক ভাষা প্রশ্ন" : "Natural Language Query"}
            </h2>
            <p className="text-sm text-purple-100">
              {isBn
                ? "ডেটাবেস সম্পর্কে যেকোনো প্রশ্ন জিজ্ঞাসা করুন"
                : "Ask any question about your database"}
            </p>
          </div>
        </div>

        <form onSubmit={submitQuestion} className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              isBn
                ? "যেমন: কুড়িগ্রামে কতজন O+ দাতা আছে?"
                : "e.g., How many O+ donors are eligible in Kurigram?"
            }
            className="flex-grow px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder:text-purple-200 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          <button
            type="submit"
            disabled={queryLoading || !question.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-2xl font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50"
          >
            {queryLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isBn ? "জিজ্ঞাসা করুন" : "Ask"}
          </button>
        </form>

        {answer && (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  queryUsingAI
                    ? "bg-green-400/30 text-green-50"
                    : "bg-amber-400/30 text-amber-50"
                }`}
              >
                {queryUsingAI
                  ? (queryProvider === "deepseek"
                      ? "DeepSeek AI"
                      : queryProvider === "zhipu"
                        ? "Zhipu GLM"
                        : "AI")
                  : "Rule-based"}
              </span>
              {queryContext && (
                <span className="text-xs text-purple-100">{queryContext}</span>
              )}
            </div>
            <p className="text-white leading-relaxed">{answer}</p>
          </div>
        )}

        {/* Example questions */}
        <div className="mt-4">
          <p className="text-xs text-purple-200 mb-2">
            {isBn ? "উদাহরণ প্রশ্ন:" : "Example questions:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              isBn ? "কতজন দাতা আছে?" : "How many donors do we have?",
              isBn ? "O+ ইনভেন্টরি কত?" : "What's the O+ inventory?",
              isBn ? "কোন জেলায় সবচেয়ে বেশি দাতা?" : "Which district has most donors?",
            ].map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuestion(q)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Back to dashboard */}
      <div className="text-center">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          ← {isBn ? "ড্যাশবোর্ডে ফিরে যান" : "Back to dashboard"}
        </Link>
      </div>
    </div>
  );
}
