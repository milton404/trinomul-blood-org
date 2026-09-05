"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * A slim glass-morphism banner that floats at the top of a map container when
 * the device is offline. Cached tiles still render, but unvisited areas show
 * grey — this banner explains why and reassures the user that markers remain
 * accurate.
 *
 * Render inside a relatively-positioned map wrapper (the parent already has
 * `relative` or `overflow-hidden` with rounded corners).
 */
export default function OfflineMapBanner() {
  const t = useTranslations("map");
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-900/85 backdrop-blur-md text-white text-[11px] font-semibold shadow-lg pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>{t("offline_banner")}</span>
    </div>
  );
}
