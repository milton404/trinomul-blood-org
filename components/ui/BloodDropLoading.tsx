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
 * A soft radial glow breathes behind a liquid-filled drop that pulses
 * like a heartbeat, drips a bead, and is underlined by a drawing
 * ECG heartbeat line — reinforcing the blood-bank brand.
 */
export function BloodDropLoading({
  label = "Loading",
  sublabel,
  size = 80,
  showLabel = true,
  className,
}: BloodDropLoadingProps) {
  const rawId = useId().replace(/:/g, "");
  const clipId = `blood-drop-clip-${rawId}`;
  const gradId = `blood-drop-grad-${rawId}`;
  const glowId = `blood-drop-glow-${rawId}`;
  const stage = size * 1.7;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-5",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="blood-drop-stage relative flex items-center justify-center"
        style={{ width: stage, height: stage }}
      >
        <svg
          className="blood-drop-glow absolute"
          style={{ width: stage, height: stage }}
          viewBox="0 0 100 100"
          aria-hidden
        >
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.38" />
              <stop offset="55%" stopColor="#dc2626" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill={`url(#${glowId})`} />
        </svg>

        <svg
          viewBox="0 0 48 48"
          className="blood-drop-svg relative"
          style={{ width: size, height: size }}
        >
          <defs>
            <linearGradient
              id={gradId}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="55%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <clipPath id={clipId}>
              <path d="M24 2 C 38 18, 45 28, 45 34 C 45 42, 38 46, 24 46 C 10 46, 3 42, 3 34 C 3 28, 10 18, 24 2 Z" />
            </clipPath>
          </defs>
          <path
            d="M24 2 C 38 18, 45 28, 45 34 C 45 42, 38 46, 24 46 C 10 46, 3 42, 3 34 C 3 28, 10 18, 24 2 Z"
            fill="rgba(220, 38, 38, 0.10)"
            stroke="rgba(220, 38, 38, 0.32)"
            strokeWidth="1.1"
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
            <circle cx="13" cy="15" r="4.5" fill="rgba(255,255,255,0.42)" />
            <circle cx="33" cy="22" r="2.2" fill="rgba(255,255,255,0.26)" />
          </g>
          <circle
            className="blood-drop-bead"
            cx="24"
            cy="47"
            r="2.2"
            fill="#dc2626"
          />
        </svg>
      </div>

      {showLabel && (
        <div className="flex flex-col items-center gap-2">
          <svg
            className="blood-ecg"
            width="132"
            height="22"
            viewBox="0 0 132 22"
            fill="none"
            aria-hidden
          >
            <path
              className="blood-ecg-path"
              d="M0 11 H44 L50 4 L56 18 L62 8 L68 11 H132"
              stroke="#dc2626"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex items-center justify-center gap-2.5">
            <span className="blood-loading-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            <span
              className="blood-loading-dot h-1.5 w-1.5 rounded-full bg-red-500"
              style={{ animationDelay: "0.18s" }}
            />
            <span
              className="blood-loading-dot h-1.5 w-1.5 rounded-full bg-red-500"
              style={{ animationDelay: "0.36s" }}
            />
            <p className="blood-label-text text-sm font-semibold text-slate-700">
              {label}
            </p>
          </div>
          <div className="blood-progress-track h-1 w-48 rounded-full bg-slate-100" />
          {sublabel ? (
            <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Full-page variant used as a Suspense fallback: a centered blood-drop
 * animation floating above optional children.
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
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 p-6">
      <BloodDropLoading label={label} sublabel={sublabel} />
      {children}
    </div>
  );
}
