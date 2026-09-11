"use client";

import { useState, useEffect, useCallback } from "react";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import { useTranslations } from "next-intl";
import {
  Wrench,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Activity,
} from "lucide-react";
import { serverRunSystemHealthChecks, type HealthCheckResult } from "@/lib/db-actions";

const STATUS_META = {
  ok: {
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    label: "OK",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "WARNING",
  },
  error: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "ERROR",
  },
} as const;

export default function AdminMaintenancePage() {
  const t = useTranslations("admin");
  const [checks, setChecks] = useState<HealthCheckResult[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runChecks = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const results = await serverRunSystemHealthChecks();
      setChecks(results);
      setLastRun(new Date());
    } catch (err: any) {
      console.error("Health checks failed:", err);
      setChecks([
        {
          section: "System",
          status: "error",
          message: "Failed to run health checks",
          details: err?.message,
        },
      ]);
    } finally {
      setIsFetching(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  if (isFetching) {
    return <DetailPageSkeleton />;
  }

  const errorCount = checks.filter((c) => c.status === "error").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const okCount = checks.filter((c) => c.status === "ok").length;
  const overallStatus = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "ok";
  const overallMeta = STATUS_META[overallStatus];

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("maintenance") || "System Maintenance"}
            </h1>
            <p className="text-sm text-slate-500">
              {t("maintenance_desc") ||
                "App health monitor — shows what's wrong and which section has the issue"}
            </p>
          </div>
        </div>
        <button
          onClick={() => runChecks()}
          disabled={isRefreshing}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t("recheck") || "Re-run checks"}
        </button>
      </div>

      <div className={`bg-white p-6 rounded-3xl shadow-sm border-2 ${overallMeta.border}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${overallMeta.bg}`}>
            <overallMeta.icon className={`w-7 h-7 ${overallMeta.color}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              {errorCount > 0
                ? `${errorCount} issue(s) need fixing`
                : warningCount > 0
                  ? "App running with warnings"
                  : "All systems healthy"}
            </h2>
            <p className="text-sm text-slate-500">
              {okCount} OK · {warningCount} warnings · {errorCount} errors
              {lastRun && (
                <span className="ml-2 text-slate-400">
                  · checked {lastRun.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {errorCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-900">
              {t("maintenance_fix_first") || "Fix these first (developer action required)"}
            </h3>
          </div>
          <ul className="space-y-1.5">
            {checks
              .filter((c) => c.status === "error")
              .map((c) => (
                <li key={c.section} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="font-semibold">{c.section}:</span>
                  <span>{c.message}</span>
                  {c.details && (
                    <span className="text-red-600 text-xs font-mono truncate">— {c.details}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {checks.map((check) => {
          const meta = STATUS_META[check.status];
          const Icon = meta.icon;
          return (
            <div
              key={check.section}
              className={`bg-white p-5 rounded-2xl shadow-sm border ${meta.border} flex items-start gap-4`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                <Icon className={`w-5 h-5 ${meta.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">{check.section}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </span>
                  {check.latencyMs != null && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Activity className="w-3 h-3" />
                      {check.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{check.message}</p>
                {check.details && (
                  <p className="text-xs text-slate-400 mt-1 font-mono break-all">
                    {check.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}