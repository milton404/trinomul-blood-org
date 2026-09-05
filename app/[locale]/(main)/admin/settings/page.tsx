"use client";

import { useState, useEffect } from "react";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import { useTranslations } from "next-intl";
import {
  Settings,
  Globe,
  Phone,
  Save,
  Loader2,
  Shield,
  Facebook,
} from "lucide-react";
import { toast } from "sonner";
import { serverGetSiteSettings, serverUpdateSiteSettings } from "@/lib/db-actions";

// Default values used when no persisted setting exists yet.
const DEFAULTS = {
  siteName: "Trinomul Blood Bank Rangpur",
  tagline: "Connecting Life Savers Across Rangpur Division",
  contactEmail: "info@trinomul.org",
  contactPhone: "+880-XXXXXXXXX",
  address: "Rangpur Medical College Campus, Rangpur",
  facebookPage: "",
  facebookGroup: "",
  youtube: "",
  aboutTextEn:
    "Trinomul Blood Bank Rangpur is a community-driven blood donation platform serving the people of Rangpur Division.",
  aboutTextBn:
    "তৃণমূল ব্লাড ব্যাংক রংপুর রংপুর বিভাগের মানুষের সেবা দেওয়া একটি সম্প্রদায়-নেতৃত্বাধীন রক্তদান প্ল্যাটফর্ম।",
};

export default function AdminSettingsPage() {
  const t = useTranslations("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [saved, setSaved] = useState(false);

  const [siteInfo, setSiteInfo] = useState({
    siteName: DEFAULTS.siteName,
    tagline: DEFAULTS.tagline,
    contactEmail: DEFAULTS.contactEmail,
    contactPhone: DEFAULTS.contactPhone,
    address: DEFAULTS.address,
  });

  const [socialLinks, setSocialLinks] = useState({
    facebookPage: DEFAULTS.facebookPage,
    facebookGroup: DEFAULTS.facebookGroup,
    youtube: DEFAULTS.youtube,
  });

  const [aboutText, setAboutText] = useState({
    en: DEFAULTS.aboutTextEn,
    bn: DEFAULTS.aboutTextBn,
  });

  // Load persisted settings once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = (await serverGetSiteSettings()) as Record<string, string>;
        if (cancelled) return;
        setSiteInfo({
          siteName: stored.siteName ?? DEFAULTS.siteName,
          tagline: stored.tagline ?? DEFAULTS.tagline,
          contactEmail: stored.contactEmail ?? DEFAULTS.contactEmail,
          contactPhone: stored.contactPhone ?? DEFAULTS.contactPhone,
          address: stored.address ?? DEFAULTS.address,
        });
        setSocialLinks({
          facebookPage: stored.facebookPage ?? DEFAULTS.facebookPage,
          facebookGroup: stored.facebookGroup ?? DEFAULTS.facebookGroup,
          youtube: stored.youtube ?? DEFAULTS.youtube,
        });
        setAboutText({
          en: stored.aboutTextEn ?? DEFAULTS.aboutTextEn,
          bn: stored.aboutTextBn ?? DEFAULTS.aboutTextBn,
        });
      } catch (err) {
        console.error("Failed to load site settings:", err);
        toast.error(t("settings_load_error"));
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaved(false);
    try {
      await serverUpdateSiteSettings({
        siteName: siteInfo.siteName,
        tagline: siteInfo.tagline,
        contactEmail: siteInfo.contactEmail,
        contactPhone: siteInfo.contactPhone,
        address: siteInfo.address,
        facebookPage: socialLinks.facebookPage,
        facebookGroup: socialLinks.facebookGroup,
        youtube: socialLinks.youtube,
        aboutTextEn: aboutText.en,
        aboutTextBn: aboutText.bn,
      });
      setSaved(true);
      toast.success(t("settings_saved"));
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error("Failed to save site settings:", err);
      toast.error(err?.message || t("settings_save_error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <DetailPageSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("settings")}</h1>
          <p className="text-sm text-slate-500">{t("settings_desc")}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            {t("site_information")}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("site_name")}
              </label>
              <input
                type="text"
                value={siteInfo.siteName}
                onChange={(e) =>
                  setSiteInfo({ ...siteInfo, siteName: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("tagline")}
              </label>
              <input
                type="text"
                value={siteInfo.tagline}
                onChange={(e) =>
                  setSiteInfo({ ...siteInfo, tagline: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {t("contact_email")}
                </label>
                <input
                  type="email"
                  value={siteInfo.contactEmail}
                  onChange={(e) =>
                    setSiteInfo({ ...siteInfo, contactEmail: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  {t("contact_phone")}
                </label>
                <input
                  type="text"
                  value={siteInfo.contactPhone}
                  onChange={(e) =>
                    setSiteInfo({ ...siteInfo, contactPhone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("address")}
              </label>
              <input
                type="text"
                value={siteInfo.address}
                onChange={(e) =>
                  setSiteInfo({ ...siteInfo, address: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Facebook className="w-5 h-5 text-blue-600" />
            {t("social_links")}
          </h3>
          <div className="space-y-4">
            {[
              {
                key: "facebookPage",
                label: "Facebook Page URL",
                ph: "https://facebook.com/yourpage",
              },
              {
                key: "facebookGroup",
                label: "Facebook Group URL",
                ph: "https://facebook.com/groups/yourgroup",
              },
              {
                key: "youtube",
                label: "YouTube URL",
                ph: "https://youtube.com/@yourchannel",
              },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {label}
                </label>
                <input
                  type="url"
                  placeholder={ph}
                  value={socialLinks[key as keyof typeof socialLinks]}
                  onChange={(e) =>
                    setSocialLinks({ ...socialLinks, [key]: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            {t("about_text")}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                English (EN)
              </label>
              <textarea
                value={aboutText.en}
                onChange={(e) =>
                  setAboutText({ ...aboutText, en: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                বাংলা (BN)
              </label>
              <textarea
                value={aboutText.bn}
                onChange={(e) =>
                  setAboutText({ ...aboutText, bn: e.target.value })
                }
                rows={3}
                dir="rtl"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            {t("system_settings")}
          </h3>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-sm text-amber-800">
              ⚠️ {t("maintenance_mode_note")}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-8 py-3 rounded-xl text-white font-medium transition-all flex items-center gap-2 ${saved ? "bg-green-600" : "bg-red-600 hover:bg-red-700"} disabled:opacity-50`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              "✓"
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? t("saved") : t("save_settings")}
          </button>
        </div>
      </form>
    </div>
  );
}
