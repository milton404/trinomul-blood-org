"use client";

export type MapLayerType = "street" | "satellite";

interface LayerToggleProps {
  value: MapLayerType;
  onChange: (layer: MapLayerType) => void;
}

/**
 * Street / Satellite toggle.
 *
 * Responsive layout:
 *   - Mobile:  bottom-right, icons only
 *   - Desktop: bottom-right, full labels
 */
export default function LayerToggle({ value, onChange }: LayerToggleProps) {
  return (
    <div className="map-overlay-ui absolute bottom-4 right-4 z-[400]">
      <div className="flex items-center gap-0.5 xs:gap-1 rounded-lg xs:rounded-xl bg-white/95 backdrop-blur-md border-2 border-slate-300 shadow-lg p-0.5 xs:p-1">
        <button
          type="button"
          title="Street map"
          onClick={() => onChange("street")}
          className={`flex items-center gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-md xs:rounded-lg text-[10px] xs:text-xs font-bold transition-all ${
            value === "street"
              ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-blue-500/30"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="xs:w-3.5 xs:h-3.5 w-3 h-3"
          >
            <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
            <path d="M15 5.764v15" />
            <path d="M9 3.236v15" />
          </svg>
          <span className="hidden sm:inline">Street</span>
        </button>
        <button
          type="button"
          title="Satellite view"
          onClick={() => onChange("satellite")}
          className={`flex items-center gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-md xs:rounded-lg text-[10px] xs:text-xs font-bold transition-all ${
            value === "satellite"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="xs:w-3.5 xs:h-3.5 w-3 h-3"
          >
            <path d="m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5" />
            <path d="M16.5 7.5 19 5" />
            <path d="m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5" />
            <path d="M9 21a6 6 0 0 0-6-6" />
            <path d="M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z" />
          </svg>
          <span className="hidden sm:inline">Satellite</span>
        </button>
      </div>
    </div>
  );
}
