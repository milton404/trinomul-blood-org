"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

interface DonorQrCardProps {
  donorId: number;
  bloodGroup: string;
  district: string;
  isVerified?: boolean;
  /** Donor name for the download filename. */
  donorName?: string;
  /** Compact mode — smaller QR, no download button (for inline display). */
  compact?: boolean;
}

/**
 * Donor QR card with a blood-drop SVG icon overlaid in the center.
 *
 * The QR encodes `{ type: "donor", id, bg, d, v }` so a scanner can deep-link
 * to the donor profile. errorCorrectionLevel "H" (30%) survives the center
 * icon occlusion. The blood-drop SVG sits directly on the QR — no circular
 * border (per design preference).
 */
export default function DonorQrCard({
  donorId,
  bloodGroup,
  district,
  isVerified,
  donorName,
  compact = false,
}: DonorQrCardProps) {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  // QR payload — compact JSON for scanners.
  const payload = JSON.stringify({
    type: "donor",
    id: donorId,
    bg: bloodGroup,
    d: district,
    v: isVerified ? 1 : 0,
  });

  const generateQr = useCallback(async () => {
    try {
      const size = compact ? 160 : 400;
      const canvas = document.createElement("canvas");
      const dataUrl = await QRCode.toDataURL(payload, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      // Load into canvas for gradient recolor.
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);

      // Diagonal gradient recolor (red → rose, matching brand).
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const stops: Array<[number, number, number]> = [
        [220, 38, 38], // red-600
        [190, 18, 60], // rose-700
        [136, 19, 55], // rose-800
      ];
      const lastIdx = stops.length - 1;
      for (let i = 0; i < data.length; i += 4) {
        const isDark = data[i] + data[i + 1] + data[i + 2] < 384;
        if (isDark) {
          const x = (i / 4) % size;
          const y = Math.floor((i / 4) / size);
          const t = (x + y) / (size * 2);
          const seg = Math.min(t * lastIdx, lastIdx - 0.0001);
          const idx = Math.floor(seg);
          const local = seg - idx;
          const a = stops[idx];
          const b = stops[idx + 1];
          data[i] = Math.round(a[0] + (b[0] - a[0]) * local);
          data[i + 1] = Math.round(a[1] + (b[1] - a[1]) * local);
          data[i + 2] = Math.round(a[2] + (b[2] - a[2]) * local);
          data[i + 3] = 255;
        } else {
          data[i + 3] = 0; // transparent background
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setQrDataUrl(canvas.toDataURL("image/png"));
    } catch {
      setQrDataUrl(null);
    }
  }, [payload, compact]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generateQr();
  }, [generateQr]);

  const handleDownload = async () => {
    if (!frameRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(frameRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        skipFonts: true,
      });
      const link = document.createElement("a");
      link.download = `donor-qr-${donorName || donorId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(isBn ? "QR কার্ড ডাউনলোড হয়েছে" : "QR card downloaded");
    } catch {
      toast.error(isBn ? "ডাউনলোড ব্যর্থ" : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!qrDataUrl) {
    return (
      <div className={`flex items-center justify-center ${compact ? "w-24 h-24" : "w-48 h-48"}`}>
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const frameSize = compact ? "w-24 h-24" : "w-48 h-48";
  const iconSize = compact ? 20 : 40;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* QR frame — captured by toPng for download */}
      <div
        ref={frameRef}
        className={`relative ${frameSize} bg-white rounded-xl flex items-center justify-center`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Donor QR" className="w-full h-full object-contain" />
        {/* Blood-drop SVG overlay — centered, no circular border */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="absolute"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <path
            d="M16,6 C12.5,10.5 9.5,14 9.5,17.5 C9.5,21.1 12.4,24 16,24 C19.6,24 22.5,21.1 22.5,17.5 C22.5,14 19.5,10.5 16,6Z"
            fill="#ffffff"
            opacity="0.95"
          />
          <text
            x="16"
            y="19"
            textAnchor="middle"
            fontSize={bloodGroup && bloodGroup.length > 2 ? "4" : "5"}
            fontWeight="900"
            fill="#dc2626"
          >
            {bloodGroup}
          </text>
        </svg>
      </div>

      {!compact && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {isBn ? "QR ডাউনলোড" : "Download QR"}
        </button>
      )}
    </div>
  );
}