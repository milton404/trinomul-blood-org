"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link2, Check, QrCode, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface SharePageSectionProps {
  /** URL to share. Defaults to window.location.href. */
  url?: string;
  /** Filename base for the downloaded QR PNG (without extension). */
  fileNameBase?: string;
  /** Optional title shown above the buttons. Overrides i18n default. */
  title?: string;
  /** Optional subtitle shown under the title. Overrides i18n default. */
  subtitle?: string;
}

export default function SharePageSection({
  url,
  fileNameBase = "page-qr",
  title,
  subtitle,
}: SharePageSectionProps) {
  const t = useTranslations("common");
  const [pageUrl, setPageUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  useEffect(() => {
    setPageUrl(url || (typeof window !== "undefined" ? window.location.href : ""));
  }, [url]);

  const handleCopyLink = useCallback(async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      toast.success(t("link_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copy_failed"));
    }
  }, [pageUrl, t]);

  const handleDownloadQr = useCallback(async () => {
    if (!pageUrl) return;
    setDownloadingQr(true);
    try {
      const dataUrl = await QRCode.toDataURL(pageUrl, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.download = `${fileNameBase}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(t("qr_downloaded"));
    } catch {
      toast.error(t("qr_failed"));
    } finally {
      setDownloadingQr(false);
    }
  }, [pageUrl, fileNameBase, t]);

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-6 sm:p-8">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">
          {title || t("share_page_title")}
        </h2>
        <p className="text-sm text-slate-500">{subtitle || t("share_page_subtitle")}</p>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-4 max-w-xl mx-auto">
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors min-h-[52px] flex-1"
        >
          {copied ? (
            <Check className="w-5 h-5" />
          ) : (
            <Link2 className="w-5 h-5" />
          )}
          {t("copy_link")}
        </button>
        <button
          type="button"
          onClick={handleDownloadQr}
          disabled={downloadingQr}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors min-h-[52px] flex-1 disabled:opacity-60"
        >
          {downloadingQr ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <QrCode className="w-5 h-5" />
          )}
          {t("download_qr")}
        </button>
      </div>
    </section>
  );
}