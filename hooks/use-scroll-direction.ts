"use client";

import { useEffect, useState } from "react";

export type ScrollDirection = "up" | "down" | null;

/**
 * Tracks the vertical scroll direction and whether the page is at the top.
 * Uses a requestAnimationFrame throttle plus a pixel threshold so tiny
 * scroll jitters don't flip the direction. Used for the Facebook-style
 * auto-hiding header and bottom tab bar on phone.
 */
export function useScrollDirection(threshold = 8): {
  direction: ScrollDirection;
  atTop: boolean;
} {
  const [direction, setDirection] = useState<ScrollDirection>(null);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const diff = y - lastY;
        setAtTop(y <= threshold);
        if (Math.abs(diff) > threshold) {
          setDirection(diff > 0 ? "down" : "up");
        }
        lastY = y;
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { direction, atTop };
}
