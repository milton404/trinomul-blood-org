"use client";

import { useId } from "react";
import { clsx } from "clsx";

type BloodDropLoadingProps = {
  label?: string;
  sublabel?: string;
  size?: number;
  showLabel?: boolean;
  className?: string;
};

/**
 * Animated blood-drop loading indicator.
 * The drop fills with liquid, pulses like a heartbeat, drips a bead,
 * and expands radar rings — reinforcing the blood-bank brand.
 */
export function BloodDropLoading({
  label = "Loading",
  sublabel,
  size = 72,
  showLabel = true,
  className,
}: BloodDropLoadingProps) {
  const rawId = useId().replace(/:/g, "");
  const clipId = `blood-drop-clip-${rawId}`;
  const gradId = `blood-drop-grad-${rawId}`;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="blood-ripple-ring absolute rounded-full bg-red-500/25" />
        <span
          className="blood-ripple-ring absolute rounded-full bg-red-500/20"
          style={{ animationDelay: "1.3s" }}
        />
        <svg
          viewBox="0 0 48 48"
          className="blood-drop-svg relative"
          style={{ width: size * 0.78, height: size * 0.78 }}
        >
          <defs>
            <linearGradient
              id={gradId}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <clipPath id={clipId}>
              <path d="M24 2 C 38 18, 45 28, 45 34 C 45 42, 38 46, 24 46 C 10 46, 3 42, 3 34 C 3 28, 10 18, 24 2 Z" />
            </clipPath>
          </defs>
          <path
            d="M24 2 C 38 18, 45 28, 45 34 C 45 42, 38 46, 24 46 C 10 46, 3 42, 3 34 C 3 28, 10 18, 24 2 Z"
            fill="rgba(220, 38, 38, 0.12)"
            stroke="rgba(220, 38, 38, 0.45)"
            strokeWidth="1.6"
          />
          <g clipPath={`url(#${clipId})`}>
            <rect
              className="blood-drop-fill"
              x="0"
              y="0"
              width="48"
              height="48"
              fill={`url(#${gradId})`}
            />
            <circle cx="12" cy="14" r="4" fill="rgba(255,255,255,0.35)" />
            <circle cx="34" cy="20" r="2.4" fill="rgba(255,255,255,0.22)" />
          </g>
          <circle
            className="blood-drop-bead"
            cx="24"
            cy="47"
            r="2.4"
            fill="#dc2626"
          />
        </svg>
      </div>

      {showLabel && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center gap-2.5">
            <span className="blood-loading-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            <span
              className="blood-loading-dot h-1.5 w-1.5 rounded-full bg-red-500"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="blood-loading-dot h-1.5 w-1.5 rounded-full bg-red-500"
              style={{ animationDelay: "0.4s" }}
            />
            <p className="text-sm font-semibold text-slate-700">{label}</p>
          </div>
          <div className="blood-progress-track h-1 w-44 rounded-full bg-slate-100" />
          {sublabel ? (
            <p className="text-xs text-slate-400">{sublabel}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Full-page variant used as a Suspense fallback: a centered blood-drop
 * animation floating above skeleton placeholders.
 */
export function PageLoading({
  label,
  sublabel,
  children,
}: {
  label?: string;
  sublabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-6 p-6">
      <BloodDropLoading label={label} sublabel={sublabel} />
      {children}
    </div>
  );
}