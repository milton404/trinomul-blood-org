"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Check,
  Search as SearchIcon,
  X as ClearIcon,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  labelBn?: string;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: string;
  description?: string;
}

interface ModernSelectProps<T = string> {
  value: T | "";
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  locale?: "en" | "bn";
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  variant?: "blood" | "location" | "default";
  emptyMessage?: string;
  className?: string;
  icon?: ReactNode;
  /** sm = compact trigger + label (dense layouts like the homepage hero) */
  size?: "md" | "sm";
}

export default function ModernSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  label,
  locale = "en",
  searchable = false,
  searchPlaceholder = "Search...",
  disabled = false,
  clearable = true,
  variant = "default",
  emptyMessage = "No options found",
  className,
  icon,
  size = "md",
}: ModernSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const getLabel = (opt: SelectOption<T>) =>
    locale === "bn" && opt.labelBn ? opt.labelBn : opt.label;

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.labelBn && o.labelBn.includes(search)) ||
        (o.badge && o.badge.toLowerCase().includes(q)),
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (isOpen) {
      const nonDisabled = filteredOptions.filter((o) => !o.disabled);
      if (nonDisabled.length > 0 && focusedIndex === -1) {
        setFocusedIndex(filteredOptions.indexOf(nonDisabled[0]));
      }
    }
  }, [isOpen, filteredOptions, focusedIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    const nonDisabled = filteredOptions.filter((o) => !o.disabled);
    const currentNonDisabledIdx = nonDisabled.indexOf(
      filteredOptions[focusedIndex],
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (nonDisabled.length === 0) return;
        const nextNonDisabled =
          (currentNonDisabledIdx + 1) % nonDisabled.length;
        setFocusedIndex(filteredOptions.indexOf(nonDisabled[nextNonDisabled]));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (nonDisabled.length === 0) return;
        const prevNonDisabled =
          (currentNonDisabledIdx - 1 + nonDisabled.length) %
          nonDisabled.length;
        setFocusedIndex(filteredOptions.indexOf(nonDisabled[prevNonDisabled]));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) {
            onChange(opt.value);
            setIsOpen(false);
            setSearch("");
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  const handleSelect = (opt: SelectOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    setSearch("");
    setFocusedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("" as T);
  };

  const variantStyles = {
    default: {
      trigger:
        "bg-white border-slate-200 hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-slate-200",
      optionActive: "bg-slate-50 text-slate-900",
      optionHover: "hover:bg-slate-50 hover:text-slate-900",
    },
    blood: {
      trigger:
        "bg-white border-slate-400 hover:border-slate-500 focus-within:border-slate-600 focus-within:ring-slate-200",
      optionActive: "bg-rose-50 text-rose-700",
      optionHover: "hover:bg-rose-50 hover:text-rose-700",
    },
    location: {
      trigger:
        "bg-white border-slate-400 hover:border-slate-500 focus-within:border-slate-600 focus-within:ring-slate-200",
      optionActive: "bg-emerald-50 text-emerald-700",
      optionHover: "hover:bg-emerald-50 hover:text-emerald-700",
    },
  }[variant];

  const bloodColorMap: Record<string, string> = {
    "A+": "bg-blue-100 text-blue-700 border-blue-200",
    "A-": "bg-blue-50 text-blue-600 border-blue-100",
    "B+": "bg-teal-100 text-teal-700 border-teal-200",
    "B-": "bg-teal-50 text-teal-600 border-teal-100",
    "AB+": "bg-violet-100 text-violet-700 border-violet-200",
    "AB-": "bg-violet-50 text-violet-600 border-violet-100",
    "O+": "bg-rose-100 text-rose-700 border-rose-200",
    "O-": "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label
          className={cn(
            "block font-bold text-slate-600 ml-1 tracking-wide uppercase",
            size === "sm" ? "text-[10px] mb-1" : "text-[11px] mb-1.5",
          )}
        >
          {label}
        </label>
      )}

      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        className={cn(
          "group relative w-full border-2 transition-all duration-200",
          size === "sm" ? "px-2.5 py-2 rounded-lg" : "px-2.5 py-2 rounded-xl",
          "cursor-pointer outline-none focus-within:ring-4",
          "shadow-sm hover:shadow-md",
          variantStyles.trigger,
          disabled && "opacity-50 cursor-not-allowed bg-slate-50",
        )}
      >
        <div className="flex items-center gap-1.5 pr-12">
          {icon && (
            <span className="flex-shrink-0 text-slate-400 group-hover:text-slate-500 transition-colors">
              {icon}
            </span>
          )}
          {variant === "blood" && selectedOption ? (
            <span
              className={cn(
                "flex-shrink-0 flex items-center gap-1 rounded-lg font-bold border-2 shadow-sm",
                size === "sm"
                  ? "px-2 py-0.5 text-[12px]"
                  : "px-2.5 py-0.5 text-[13px]",
                bloodColorMap[selectedOption.value] ||
                  "bg-slate-100 text-slate-700 border-slate-200",
              )}
            >
              <Droplets className="w-3 h-3" />
              {selectedOption.value}
            </span>
          ) : (
            <span
              className={cn(
                "font-medium truncate",
                size === "sm" ? "text-[13px]" : "text-[13px]",
                selectedOption ? "text-slate-800" : "text-slate-400",
              )}
            >
              {selectedOption ? getLabel(selectedOption) : placeholder}
            </span>
          )}
        </div>

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Clear selection"
            >
              <ClearIcon className="w-3.5 h-3.5" />
            </button>
          )}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn(
              "p-0.5 rounded-md text-slate-400 transition-colors",
              isOpen ? "text-slate-700" : "group-hover:text-slate-600",
            )}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl shadow-black/10 border border-slate-100 overflow-hidden"
            role="listbox"
          >
            {searchable && (
              <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setFocusedIndex(-1);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-48 p-1 scroll-smooth">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[13px]">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isFocused = idx === focusedIndex;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all duration-150",
                        "mb-0.5 last:mb-0",
                        isSelected
                          ? variantStyles.optionActive
                          : "text-slate-700",
                        isFocused && !isSelected
                          ? variantStyles.optionHover
                          : "",
                        opt.disabled &&
                          "opacity-50 cursor-not-allowed hover:bg-transparent",
                      )}
                    >
                      {variant === "blood" ? (
                        <span
                          className={cn(
                            "flex-shrink-0 min-w-[56px] h-8 rounded-lg flex items-center justify-center gap-1 font-bold text-[13px] border-2 shadow-sm",
                            bloodColorMap[opt.value] ||
                              "bg-slate-100 text-slate-700 border-slate-200",
                          )}
                        >
                          <Droplets className="w-3.5 h-3.5 opacity-80" />
                          <span>{opt.value}</span>
                        </span>
                      ) : opt.icon ? (
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                          {opt.icon}
                        </span>
                      ) : null}

                      {variant !== "blood" && (
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              "font-medium truncate",
                              isSelected ? "font-semibold" : "",
                            )}
                          >
                            {getLabel(opt)}
                          </div>
                          {opt.description && (
                            <div className="text-[11px] text-slate-400 truncate">
                              {opt.description}
                            </div>
                          )}
                        </div>
                      )}

                      {opt.badge && variant !== "blood" && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                          {opt.badge}
                        </span>
                      )}

                      {variant === "blood" && <div className="flex-1" />}

                      {isSelected && (
                        <Check className="flex-shrink-0 w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
