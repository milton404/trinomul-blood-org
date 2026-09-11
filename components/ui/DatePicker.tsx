"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  format,
  parseISO,
  isValid,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  max?: string;
  min?: string;
  className?: string;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ViewMode = "days" | "months" | "years";

export default function DatePicker({
  value,
  onChange,
  name,
  placeholder = "Select date",
  max,
  min,
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("days");
  const [viewMonth, setViewMonth] = useState(() => {
    const parsed = value ? parseISO(value) : new Date();
    return isValid(parsed) ? parsed : new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = (() => {
    if (!value) return null;
    const d = parseISO(value);
    return isValid(d) ? d : null;
  })();

  const maxDate = (() => {
    if (!max) return null;
    const d = parseISO(max);
    return isValid(d) ? d : null;
  })();

  const minDate = (() => {
    if (!min) return null;
    const d = parseISO(min);
    return isValid(d) ? d : null;
  })();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = useCallback(
    (date: Date) => {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    },
    [onChange],
  );

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const displayValue = selectedDate ? format(selectedDate, "MMM d, yyyy") : "";

  const currentYear = viewMonth.getFullYear();
  const yearRangeStart = Math.floor(currentYear / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

  const headerLabel = (() => {
    if (viewMode === "days") return `${MONTHS_SHORT[viewMonth.getMonth()]} ${currentYear}`;
    if (viewMode === "months") return String(currentYear);
    return `${yearRangeStart} – ${yearRangeStart + 11}`;
  })();

  const handleHeaderClick = () => {
    if (viewMode === "days") setViewMode("months");
    else if (viewMode === "months") setViewMode("years");
  };

  const handlePrev = () => {
    if (viewMode === "days") setViewMonth((m) => subMonths(m, 1));
    else if (viewMode === "months") setViewMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1));
    else setViewMonth((m) => new Date(m.getFullYear() - 12, m.getMonth(), 1));
  };

  const handleNext = () => {
    if (viewMode === "days") setViewMonth((m) => addMonths(m, 1));
    else if (viewMode === "months") setViewMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1));
    else setViewMonth((m) => new Date(m.getFullYear() + 12, m.getMonth(), 1));
  };

  const isYearDisabled = (year: number) => {
    if (maxDate && year > maxDate.getFullYear()) return true;
    if (minDate && year < minDate.getFullYear()) return true;
    return false;
  };

  const isMonthDisabled = (monthIdx: number) => {
    const testDate = new Date(currentYear, monthIdx, 1);
    if (maxDate && testDate > maxDate) return true;
    if (minDate && endOfMonth(testDate) < minDate) return true;
    return false;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        name={name}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white text-left flex items-center gap-2"
      >
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span className={displayValue ? "text-slate-800" : "text-slate-400"}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              type="button"
              onClick={handleHeaderClick}
              className="flex items-center gap-1 text-sm font-semibold text-slate-800 hover:text-red-600 transition-colors px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200"
            >
              {headerLabel}
              <ChevronRight className="w-3 h-3 rotate-90 opacity-50" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {viewMode === "days" && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isDisabled = maxDate ? day > maxDate : false;
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelect(day)}
                      className={[
                        "aspect-square rounded-lg text-xs font-medium transition-colors flex items-center justify-center",
                        !inMonth ? "text-slate-300" : "text-slate-700",
                        inMonth && !isSelected && !isDisabled ? "hover:bg-red-50 hover:text-red-600" : "",
                        isSelected ? "bg-red-600 text-white hover:bg-red-700" : "",
                        isDisabled ? "text-slate-200 cursor-not-allowed" : "",
                        isToday && !isSelected ? "ring-1 ring-red-300" : "",
                      ].join(" ")}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_FULL.map((m, idx) => {
                const disabled = isMonthDisabled(idx);
                const isActive = idx === viewMonth.getMonth();
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setViewMonth((d) => new Date(d.getFullYear(), idx, 1));
                      setViewMode("days");
                    }}
                    className={[
                      "py-2 rounded-lg text-xs font-medium transition-colors",
                      isActive ? "bg-red-600 text-white" : "text-slate-700 hover:bg-red-50 hover:text-red-600",
                      disabled ? "text-slate-200 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {MONTHS_SHORT[idx]}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "years" && (
            <div className="grid grid-cols-3 gap-1.5">
              {years.map((year) => {
                const disabled = isYearDisabled(year);
                const isActive = year === currentYear;
                return (
                  <button
                    key={year}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setViewMonth((d) => new Date(year, d.getMonth(), 1));
                      setViewMode("months");
                    }}
                    className={[
                      "py-2 rounded-lg text-xs font-medium transition-colors",
                      isActive ? "bg-red-600 text-white" : "text-slate-700 hover:bg-red-50 hover:text-red-600",
                      disabled ? "text-slate-200 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
