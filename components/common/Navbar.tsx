﻿﻿"use client";

import Image from "next/image";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useAuthStore } from "@/store/authStore";
import {
  Menu,
  X,
  LogOut,
  User,
  Settings,
  Heart,
  Users,
  Droplets,
  MapPin,
  Trophy,
  MessageCircle,
  QrCode,
  Search,
  BookOpen,
  ScanLine,
  Bookmark,

} from "lucide-react";
import { useState, useEffect } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { clearSession } from "@/components/providers/AuthProvider";
import QrScannerModal from "./QrScannerModal";
import BottomNav from "./BottomNav";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

export default function Navbar() {
  const t = useTranslations("common");
  const { user, role, clearAuth } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [trackCode, setTrackCode] = useState("");
  const pathname = usePathname();
  const { direction, atTop } = useScrollDirection();
  // Facebook-style: hide the header when scrolling down (phone only).
  const hideHeader = !atTop && direction === "down";

  useEffect(() => {
    setIsTrackOpen(false);
    setIsScanOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isTrackOpen && !isScanOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTrackOpen(false);
        setIsScanOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTrackOpen, isScanOpen]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackCode.trim();
    if (!code) return;
    router.push(`/track/${encodeURIComponent(code)}`);
    setTrackCode("");
    setIsTrackOpen(false);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    clearAuth();
    router.push("/login");
  };

  const navLinks = [
    { href: "/", label: t("home"), ariaLabel: "Go to homepage", icon: Heart },
    { href: "/donors", label: t("donors"), ariaLabel: "View donor directory", icon: Users },
    { href: "/requests", label: t("requests"), ariaLabel: "View blood requests", icon: Droplets },
    { href: "/map", label: t("map"), ariaLabel: "View donor and request map", icon: MapPin },
    { href: "/leaderboard", label: t("leaderboard"), ariaLabel: "View donor leaderboard", icon: Trophy },
    { href: "/feed", label: t("community"), ariaLabel: "Community feed", icon: MessageCircle },
    { href: "/guidance", label: t("guide"), ariaLabel: "Blood donation guidelines", icon: BookOpen },
    ...(user?.id
      ? [{ href: "/bookmarks", label: t("bookmarks"), ariaLabel: "View bookmarked donors", icon: Bookmark }]
      : []),
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white/85 backdrop-blur-2xl border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_-16px_rgba(220,38,38,0.1)] transition-transform duration-300 ease-out ${
          hideHeader ? "-translate-y-full" : "translate-y-0"
        } md:translate-y-0`}
        role="banner"
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

        <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-[1600px] mx-auto">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="group flex items-center gap-1.5 shrink-0"
            aria-label={`${t("title")} - Home`}
          >
            <Image
              src="/trinomul-logo.png"
              alt="Trinomul Blood Bank"
              width={32}
              height={32}
              className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 object-contain"
              priority
            />
            <span className="truncate text-[12px] sm:text-sm md:text-lg font-bold bg-gradient-to-r from-green-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
              {t("title")}
            </span>
          </Link>

          {/* ── Center Nav (desktop) ── */}
          <nav
            className="hidden xl:flex items-center gap-0.5 mx-8"
            aria-label="Main navigation"
          >
            {navLinks.map((link, i) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? "text-red-700 bg-red-50"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={link.ariaLabel}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-red-500" : "text-slate-400 group-hover:text-slate-500"}`} />
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 bg-red-500 rounded-full" />
                  )}
                </Link>
              );
            })}

            <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />

            <button
              onClick={() => setIsTrackOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isTrackOpen || pathname.startsWith("/track")
                  ? "text-red-700 bg-red-50"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
              }`}
              aria-haspopup="dialog"
              aria-label="Track a blood request by code"
            >
              <QrCode className={`w-3.5 h-3.5 ${isTrackOpen ? "text-red-500" : "text-slate-400"}`} />
              <span>{t("track")}</span>
            </button>

            <button
              onClick={() => setIsScanOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isScanOpen
                  ? "text-red-700 bg-red-50"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
              }`}
              aria-haspopup="dialog"
              aria-label="Scan a QR code with your camera"
            >
              <ScanLine className={`w-3.5 h-3.5 ${isScanOpen ? "text-red-500" : "text-slate-400"}`} />
              <span>{t("scan_qr")}</span>
            </button>
          </nav>

          {/* ── Right Section ── */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <LanguageSwitcher className="shrink-0" />

            <span className="w-px h-5 bg-slate-200 hidden sm:block" aria-hidden="true" />

            {user ? (
              <div className="flex items-center gap-1" role="group" aria-label="User menu">
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 transition-all shrink-0"
                  aria-label={`View your ${t("profile") || "profile"}`}
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="hidden lg:inline">{t("profile")}</span>
                </Link>

                {(role === "admin" || role === "super_admin") && (
                  <Link
                    href="/admin/dashboard"
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50/80 transition-all shrink-0"
                    aria-label="Go to admin dashboard"
                  >
                    <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50/80 transition-all shrink-0"
                  aria-label="Sign out of your account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center shrink-0" role="group" aria-label="Authentication">
                <Link
                  href="/login"
                  className="hidden sm:flex p-2 sm:px-3 sm:py-1.5 rounded-lg text-[12px] font-medium text-slate-600 hover:text-red-600 hover:bg-red-50/60 transition-all shrink-0 items-center gap-1.5"
                  aria-label={t("login")}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("login")}</span>
                </Link>
                <Link
                  href="/register"
                  className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-[12px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50/60 transition-all shrink-0 flex items-center gap-1.5"
                  aria-label={t("register")}
                >
                  <Heart className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">{t("register")}</span>
                </Link>
              </div>
            )}

            {/* Mobile Toggle */}
            <button
              className="xl:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 shrink-0"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu ── */}
        {isMenuOpen && (
          <nav
            id="mobile-menu"
            className="xl:hidden border-t border-slate-100 bg-white/95 backdrop-blur-2xl px-4 py-4 sm:px-6 flex flex-col gap-1 animate-in slide-in-from-top duration-200"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "text-red-700 bg-red-50 ring-1 ring-red-100"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-red-500" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            <button
              onClick={() => { setIsMenuOpen(false); setIsTrackOpen(true); }}
              className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              aria-haspopup="dialog"
            >
              <QrCode className="w-4 h-4 shrink-0 text-slate-400" />
              <span>{t("track")}</span>
            </button>

            <button
              onClick={() => { setIsMenuOpen(false); setIsScanOpen(true); }}
              className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              aria-haspopup="dialog"
            >
              <ScanLine className="w-4 h-4 shrink-0 text-slate-400" />
              <span>{t("scan_qr")}</span>
            </button>

            {!user && (
              <>
                <div className="mt-1 border-t border-slate-100 pt-2 flex flex-col gap-1">
                  <Link
                    href="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Heart className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{t("register")}</span>
                  </Link>
                </div>
              </>
            )}

            <div className="mt-2 border-t border-slate-100 pt-3 px-4">
              <LanguageSwitcher variant="full" className="w-full justify-center" />
            </div>
          </nav>
        )}
      </header>

      {/* ── Track Popup ── */}
      {isTrackOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsTrackOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-label={t("track_title")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-red-600" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{t("track_title")}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t("track_desc")}</p>
                </div>
              </div>
              <button
                onClick={() => setIsTrackOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTrackSubmit} className="mt-5">
              <label htmlFor="nav-track-code" className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("track_placeholder")}
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  id="nav-track-code"
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder={t("track_placeholder")}
                  autoFocus
                  className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 py-3"
                  aria-label="Tracking code"
                />
              </div>
              <button
                type="submit"
                disabled={!trackCode.trim()}
                className="mt-3 w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                {t("track")}
              </button>
            </form>
          </div>
        </div>
      )}

      {isScanOpen && <QrScannerModal onClose={() => setIsScanOpen(false)} />}

      <BottomNav />
    </>
  );
}
