"use client";

export type DataFilter = "donors" | "requests" | "all";

interface DataFilterToggleProps {
  value: DataFilter;
  onChange: (filter: DataFilter) => void;
  /** Optional blood group badge to show when a blood group filter is active */
  activeBloodGroup?: string | null;
}

/**
 * Pill toggle — switches between "All", "Donors", and "Requests".
 */
export default function DataFilterToggle({
  value,
  onChange,
  activeBloodGroup,
}: DataFilterToggleProps) {
  return (
    <div className="map-overlay-ui absolute top-2 left-2 z-[300]">
      <div className="flex items-center gap-0.5 xs:gap-1 rounded-lg xs:rounded-xl bg-white/95 backdrop-blur-md border-2 border-slate-300 shadow-lg p-0.5 xs:p-1">
        {/* All */}
        <button
          type="button"
          title="Show all"
          onClick={() => onChange("all")}
          className={`flex items-center gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-md xs:rounded-lg text-[10px] xs:text-xs font-bold transition-all ${
            value === "all"
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="xs:w-3.5 xs:h-3.5 w-3 h-3">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="hidden sm:inline">All</span>
        </button>

        {/* Donors — green tint when idle, deep green when active */}
        <button
          type="button"
          title={activeBloodGroup ? `Showing ${activeBloodGroup} donors` : "Donors"}
          onClick={() => onChange("donors")}
          className={`flex items-center gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-md xs:rounded-lg text-[10px] xs:text-xs font-bold transition-all ${
            value === "donors"
              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-500/30"
              : "bg-green-50/60 text-green-700 hover:bg-green-100"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="xs:w-3.5 xs:h-3.5 w-3 h-3">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span className="hidden sm:inline">Donors</span>
          {activeBloodGroup && (
            <span className={`ml-0.5 px-1.5 py-px rounded-full text-[10px] font-extrabold leading-none ${
              value === "donors"
                ? "bg-white/30 text-white"
                : "bg-green-200/70 text-green-800"
            }`}>
              {activeBloodGroup}
            </span>
          )}
        </button>

        {/* Requests — red tint when idle, deep red when active */}
        <button
          type="button"
          title="Requests"
          onClick={() => onChange("requests")}
          className={`flex items-center gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-md xs:rounded-lg text-[10px] xs:text-xs font-bold transition-all ${
            value === "requests"
              ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/30"
              : "bg-red-50/60 text-red-700 hover:bg-red-100"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="xs:w-3.5 xs:h-3.5 w-3 h-3">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span className="hidden sm:inline">Requests</span>
        </button>
      </div>
    </div>
  );
}
