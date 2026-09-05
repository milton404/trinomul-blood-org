"use client";

import { LayoutGrid, Map } from "lucide-react";
import { useTranslations } from "next-intl";

export type MapViewMode = "list" | "map";

interface MapToggleProps {
  value: MapViewMode;
  onChange: (mode: MapViewMode) => void;
  className?: string;
}

/**
 * Glass-morphism toggle for switching between list and map views. Used on the
 * donors and requests pages. Active state uses a red pill; inactive uses
 * translucent white — matches the user's preferred glass-style UI.
 */
export default function MapToggle({
  value,
  onChange,
  className = "",
}: MapToggleProps) {
  const t = useTranslations("map");

  const base =
    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95";
  const active = "bg-red-600 text-white shadow-sm";
  const inactive = "text-slate-600 hover:text-slate-900";

  return (
    <div
      className={`inline-flex bg-white/80 backdrop-blur-md rounded-full p-0.5 border border-slate-200 shadow-sm ${className}`}
      role="tablist"
      aria-label="View mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "list"}
        onClick={() => onChange("list")}
        className={`${base} ${value === "list" ? active : inactive}`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>{t("list_view")}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "map"}
        onClick={() => onChange("map")}
        className={`${base} ${value === "map" ? active : inactive}`}
      >
        <Map className="w-3.5 h-3.5" />
        <span>{t("map_view")}</span>
      </button>
    </div>
  );
}
