"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  DatabaseBackup,
  Download,
  Loader2,
  ShieldAlert,
  HardDrive,
  CheckCircle2,
  FileJson,
  RotateCcw,
  Info,
} from "lucide-react";
import { toast } from "sonner";

const BACKUP_TABLES = [
  { name: "profiles", label: "Donors, Patients, Admins, Hospitals", icon: "users" },
  { name: "blood_requests", label: "All blood requests", icon: "request" },
  { name: "donations", label: "Donation history (all)", icon: "donation" },
  { name: "organizations", label: "Organizations", icon: "org" },
  { name: "activity_log", label: "Audit / activity log", icon: "log" },
  { name: "request_status_log", label: "Request status changes", icon: "log" },
  { name: "request_edit_history", label: "Request edit history", icon: "log" },
  { name: "request_translations", label: "Bangla translations", icon: "translate" },
  { name: "social_posts", label: "Community posts", icon: "social" },
  { name: "social_post_likes", label: "Post likes", icon: "social" },
  { name: "social_post_comments", label: "Post comments", icon: "social" },
  { name: "social_post_shares", label: "Post shares", icon: "social" },
  { name: "social_post_saves", label: "Saved posts", icon: "social" },
  { name: "stories", label: "Stories", icon: "social" },
  { name: "story_views", label: "Story views", icon: "social" },
  { name: "donor_matches", label: "Donor matches", icon: "match" },
  { name: "donor_bookmarks", label: "Donor bookmarks", icon: "bookmark" },
  { name: "donor_contact_clicks", label: "Contact button clicks", icon: "click" },
  { name: "saved_patients", label: "Saved patients", icon: "patient" },
  { name: "notifications", label: "User notifications", icon: "bell" },
  { name: "contact_messages", label: "Contact messages", icon: "mail" },
  { name: "email_log", label: "Email send log", icon: "mail" },
  { name: "email_templates", label: "Email templates", icon: "mail" },
  { name: "email_settings", label: "Email settings", icon: "mail" },
  { name: "site_settings", label: "Site settings", icon: "settings" },
  { name: "push_subscriptions", label: "Push notification subs", icon: "bell" },
  { name: "auth_rate_limits", label: "Rate limit counters", icon: "shield" },
  { name: "password_resets", label: "Password reset tokens", icon: "shield" },
  { name: "schema_migrations", label: "Schema migrations", icon: "db" },
];

export default function AdminBackupPage() {
  const t = useTranslations("admin");
  const [downloading, setDownloading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupSize, setBackupSize] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lastBackupTime");
    const size = localStorage.getItem("lastBackupSize");
    if (stored) setLastBackup(stored);
    if (size) setBackupSize(size);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch("/api/admin/backup?format=json");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const contentLength = blob.size;
      const sizeStr =
        contentLength > 1024 * 1024
          ? `${(contentLength / 1024 / 1024).toFixed(2)} MB`
          : `${(contentLength / 1024).toFixed(1)} KB`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `trinomul-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = new Date().toLocaleString();
      setLastBackup(now);
      setBackupSize(sizeStr);
      localStorage.setItem("lastBackupTime", now);
      localStorage.setItem("lastBackupSize", sizeStr);

      toast.success(t("backup_download_success"));
    } catch (err: any) {
      console.error("Backup download failed:", err);
      toast.error(err?.message || t("backup_download_error"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
          <DatabaseBackup className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("backup_title")}
          </h1>
          <p className="text-sm text-slate-500">{t("backup_desc")}</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200 mb-6">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-semibold">{t("backup_security_warning_title")}</p>
            <p>{t("backup_security_warning_body")}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-all flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] justify-center"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {downloading ? t("backup_generating") : t("backup_download_full")}
          </button>

          {lastBackup && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>
                {t("backup_last_download")}: {lastBackup}
                {backupSize && ` (${backupSize})`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-500" />
          {t("backup_what_included")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {BACKUP_TABLES.map((table) => (
            <div
              key={table.name}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <FileJson className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-mono text-slate-500 truncate">
                  {table.name}
                </p>
                <p className="text-xs text-slate-600 truncate">
                  {table.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">
          {BACKUP_TABLES.length} {t("backup_tables_total")}
        </p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-green-500" />
          {t("backup_restore_title")}
        </h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center">
              1
            </span>
            <p className="text-sm text-slate-600 pt-0.5">
              {t("backup_restore_step1")}
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center">
              2
            </span>
            <p className="text-sm text-slate-600 pt-0.5">
              {t("backup_restore_step2")}
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center">
              3
            </span>
            <p className="text-sm text-slate-600 pt-0.5">
              {t("backup_restore_step3")}
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center">
              4
            </span>
            <p className="text-sm text-slate-600 pt-0.5">
              {t("backup_restore_step4")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-semibold">{t("backup_supabase_note_title")}</p>
            <p>{t("backup_supabase_note_body")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}