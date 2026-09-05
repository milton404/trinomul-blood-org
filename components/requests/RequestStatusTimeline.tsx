"use client";

import {
  FileText,
  Search,
  UserCheck,
  Droplet,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface StatusLog {
  id: number;
  request_id: number;
  status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

interface RequestStatusTimelineProps {
  logs: StatusLog[];
  currentStatus: string;
  compact?: boolean;
}

const STATUS_FLOW = [
  { key: "submitted", label: "Submitted", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-300" },
  { key: "matching", label: "Matching Donors", icon: Search, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-300" },
  { key: "donor_found", label: "Donor Found", icon: UserCheck, color: "text-green-600", bg: "bg-green-100", border: "border-green-300" },
  { key: "donating", label: "Donating", icon: Droplet, color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-300" },
  { key: "fulfilled", label: "Fulfilled", icon: CheckCircle2, color: "text-green-700", bg: "bg-green-100", border: "border-green-400" },
];

const TERMINAL_STATUSES = ["fulfilled", "cancelled", "expired"];

export default function RequestStatusTimeline({
  logs,
  currentStatus,
  compact = false,
}: RequestStatusTimelineProps) {
  // Build a map of which statuses have been reached
  const reachedStatuses = new Map<string, StatusLog>();
  for (const log of logs) {
    if (!reachedStatuses.has(log.status)) {
      reachedStatuses.set(log.status, log);
    }
  }

  // Determine the current step index
  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === "cancelled";
  const isExpired = currentStatus === "expired";
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);

  if (compact) {
    // Compact horizontal stepper for cards
    return (
      <div className="flex items-center gap-1">
        {STATUS_FLOW.map((step, idx) => {
          const isReached = idx <= (currentIndex === -1 ? 0 : currentIndex) || reachedStatuses.has(step.key);
          const isCurrent = step.key === currentStatus;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                  isReached
                    ? `${step.bg} ${step.color}`
                    : "bg-slate-100 text-slate-300"
                } ${isCurrent ? "ring-2 ring-offset-1 ring-red-400" : ""}`}
                title={step.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              {idx < STATUS_FLOW.length - 1 && (
                <div
                  className={`h-0.5 w-4 ${isReached ? "bg-slate-300" : "bg-slate-100"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full vertical timeline
  return (
    <div className="space-y-0">
      {STATUS_FLOW.map((step, idx) => {
        const log = reachedStatuses.get(step.key);
        const isReached = log !== undefined || (idx <= (currentIndex === -1 ? 0 : currentIndex));
        const isCurrent = step.key === currentStatus;
        const isLast = idx === STATUS_FLOW.length - 1;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex gap-3">
            {/* Timeline icon and connector */}
            <div className="flex flex-col items-center">
              <div
                className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  isReached
                    ? `${step.bg} ${step.color} ${step.border}`
                    : "bg-slate-50 text-slate-300 border-slate-200"
                } ${isCurrent ? "ring-4 ring-red-100" : ""}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-grow min-h-[2rem] mt-1 ${
                    isReached ? "bg-slate-300" : "bg-slate-100"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`flex-grow pb-4 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-center gap-2">
                <p
                  className={`font-semibold text-sm ${
                    isReached ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold animate-pulse">
                    CURRENT
                  </span>
                )}
              </div>
              {log && (
                <div className="mt-1">
                  <p className="text-xs text-slate-500">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {log.note && (
                    <p className="text-xs text-slate-600 mt-0.5 italic">
                      &ldquo;{log.note}&rdquo;
                    </p>
                  )}
                  {log.changed_by && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      by {log.changed_by}
                    </p>
                  )}
                </div>
              )}
              {!isReached && (
                <p className="text-xs text-slate-300 mt-1">Pending</p>
              )}
            </div>
          </div>
        );
      })}

      {/* Cancelled / Expired terminal state */}
      {(isCancelled || isExpired) && (
        <div className="flex gap-3 mt-2">
          <div className="flex flex-col items-center">
            <div
              className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isCancelled
                  ? "bg-red-100 text-red-600 border-red-300"
                  : "bg-slate-100 text-slate-500 border-slate-300"
              }`}
            >
              {isCancelled ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-sm text-slate-900">
              {isCancelled ? "Cancelled" : "Expired"}
            </p>
            {logs.find((l) => l.status === currentStatus) && (
              <p className="text-xs text-slate-500 mt-1">
                {new Date(
                  logs.find((l) => l.status === currentStatus)!.created_at,
                ).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
