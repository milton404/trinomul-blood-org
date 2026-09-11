"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link2, Check, Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface SharePageSectionProps {
  url?: string;
  fileNameBase?: string;
  title?: string;
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");


  useEffect(() => {
    setPageUrl(url || (typeof window !== "undefined" ? window.location.href : ""));
  }, [url]);

  const generateQrWithLogo = useCallback(async (targetUrl: string): Promise<string> => {
    const size = 1024;

    const tempCanvas = document.createElement("canvas");
    await QRCode.toCanvas(tempCanvas, targetUrl, {
      width: size,
      margin: 4,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#00000000" },
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(tempCanvas, 0, 0);

    ctx.globalCompositeOperation = "source-in";
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#064e3b");
    gradient.addColorStop(0.5, "#065f46");
    gradient.addColorStop(1, "#047857");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "source-over";

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = size;
    finalCanvas.height = size;
    const finalCtx = finalCanvas.getContext("2d")!;

    finalCtx.fillStyle = "#ffffff";
    finalCtx.fillRect(0, 0, size, size);
    finalCtx.drawImage(canvas, 0, 0);

    const logoSize = size * 0.16;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;

    finalCtx.fillStyle = "#ffffff";
    finalCtx.beginPath();
    finalCtx.arc(size / 2, size / 2, logoSize / 2 + 12, 0, Math.PI * 2);
    finalCtx.fill();

    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = "/trinomul-logo.png";
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject();
      });
      finalCtx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    } catch {}

    return finalCanvas.toDataURL("image/png");
  }, []);

  useEffect(() => {
    if (!pageUrl) return;
    let cancelled = false;
    generateQrWithLogo(pageUrl)
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pageUrl, generateQrWithLogo]);

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
    if (!qrDataUrl) return;
    setDownloadingQr(true);
    try {
      const link = document.createElement("a");
      link.download = `${fileNameBase}.png`;
      link.href = qrDataUrl;
      link.click();
      toast.success(t("qr_downloaded"));
    } catch {
      toast.error(t("qr_failed"));
    } finally {
      setDownloadingQr(false);
    }
  }, [qrDataUrl, fileNameBase, t]);

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4 sm:p-5">
      <div className="text-center mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-0.5">
          {title || t("share_page_title")}
        </h2>
        <p className="text-xs text-slate-500">{subtitle || t("share_page_subtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {qrDataUrl && (
          <div className="shrink-0">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-lg border border-slate-200 shadow-sm"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors min-h-[40px] sm:w-full"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {t("copy_link")}
          </button>
          <button
            type="button"
            onClick={handleDownloadQr}
            disabled={downloadingQr || !qrDataUrl}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg transition-colors min-h-[40px] sm:w-full disabled:opacity-60"
          >
            {downloadingQr ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t("download_qr")}
          </button>
        </div>
      </div>
    </section>
  );
}
