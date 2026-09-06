"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Facebook } from "lucide-react";

export default function Footer() {
  const t = useTranslations("common");
  const locale = useLocale();

  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white py-8 overflow-hidden">
      {/* Subtle red radial glow accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.08),transparent_70%)] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/trinomul-logo.png"
                alt="Trinomul Blood Bank"
                width={28}
                height={28}
              />
              <span className="text-xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                {t("title")}
              </span>
            </div>
            <p className="text-slate-400 max-w-md mb-3 text-sm leading-relaxed">
              {t("footer_description")}
            </p>
            <div className="flex gap-2">
              <a
                href="https://facebook.com/trinomulbloodbank"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Facebook className="w-4 h-4" />
                {t("facebook_page")}
              </a>
              <a
                href="https://facebook.com/groups/trinomulbloodbank"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-700"
              >
                <Facebook className="w-4 h-4" />
                {t("facebook_group")}
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-2 text-white text-sm">Quick Links</h4>
            <ul className="space-y-1 text-slate-400 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/donors"
                  className="hover:text-white transition-colors"
                >
                  {t("donors")}
                </Link>
              </li>
              <li>
                <Link
                  href="/requests"
                  className="hover:text-white transition-colors"
                >
                  {t("requests")}
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  className="hover:text-white transition-colors"
                >
                  {t("map")}
                </Link>
              </li>
              <li>
                <Link
                  href="/blood-bank"
                  className="hover:text-white transition-colors"
                >
                  {locale === "bn" ? "ব্লাড ব্যাংক এলাকা" : "Blood Bank Areas"}
                </Link>
              </li>
              <li>
                <Link href="/transparency" className="hover:text-white transition-colors">
                  {t("transparency")}
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-white transition-colors">
                  {t("leaderboard")}
                </Link>
              </li>
              <li>
                <Link href="/downloads" className="hover:text-white transition-colors">
                  {locale === "bn" ? "অ্যাপ ডাউনলোড" : "Download App"}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-2 text-white text-sm">Support</h4>
            <ul className="space-y-1 text-slate-400 text-sm">
              <li>
                <a
                  href="/about"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t("about_us")}
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t("contact")}
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t("privacy_policy")}
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t("terms_of_service")}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-800/60 text-center text-xs text-slate-500">
          © {new Date().getFullYear()}{" "}
          {locale === "bn"
            ? "তৃণমূল ব্লাড ব্যাংক রংপুর। সর্বস্বত্ব সংরক্ষিত।"
            : "Trinomul Blood Bank Rangpur. All rights reserved."}
          <span className="block mt-1">
            Developed by{" "}
            <Link
              href="/developer"
              className="font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Md. Milton Babu
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
