"use client";

import { Sparkles } from "lucide-react";

/**
 * AI status badge for search bars.
 *
 * - Idle: static violet/fuchsia "AI" chip with a sparkle.
 * - `loading`: animated "thinking" state — shimmering gradient, pulsing
 *   sparkle and three bouncing dots so the user can clearly see the AI
 *   (DeepSeek / GLM) is working on their query.
 */
export default function AiThinkingBadge({
  loading,
  label = "AI",
}: {
  loading: boolean;
  label?: string;
}) {
  if (loading) {
    return (
      <span
        className="pointer-events-none relative inline-flex items-center gap-1 overflow-hidden rounded-md bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-500 px-1.5 py-0.5 text-[9px] font-bold text-white select-none"
        aria-live="polite"
        aria-label="AI is processing your search"
      >
        {/* shimmer sweep */}
        <span className="absolute inset-0 -translate-x-full animate-[ai-shimmer_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <Sparkles className="h-2.5 w-2.5 animate-pulse" />
        <span>{label}</span>
        {/* bouncing dots */}
        <span className="inline-flex items-end gap-[1px] pb-[1px]">
          <span className="h-[3px] w-[3px] animate-bounce rounded-full bg-white [animation-delay:0ms]" />
          <span className="h-[3px] w-[3px] animate-bounce rounded-full bg-white [animation-delay:150ms]" />
          <span className="h-[3px] w-[3px] animate-bounce rounded-full bg-white [animation-delay:300ms]" />
        </span>
        <style jsx>{`
          @keyframes ai-shimmer {
            0% {
              transform: translateX(-100%);
            }
            60%,
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </span>
    );
  }

  return (
    <span className="pointer-events-none inline-flex items-center gap-0.5 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-0.5 text-[9px] font-bold text-white select-none">
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
