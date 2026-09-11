"use client";

import {
  MapPin,
  Droplet,
  Heart,
  Phone,
  Clock,
  AlertTriangle,
  Handshake,
  Navigation,
  HeartPulse,
  ShieldCheck,
  Download,
  Loader2,
  X,
  QrCode as QrCodeIcon,
  Maximize2,
  Copy,
  Check,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { serverRecordContactClick, serverTranslateDonorText } from "@/lib/db-actions";
import { getUnionById, getUpazilaById, getDistrictById } from "@/lib/constants/rangpur";
import { useClientSide } from "@/lib/hooks/useClientSide";

import BookmarkDonorButton from "./BookmarkDonorButton";
import SaveContactButton from "./SaveContactButton";
import ShareProfileButton from "./ShareProfileButton";
import DonorShareImage from "./DonorShareImage";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.595 5.955L.08 23.82l5.981-1.57A11.83 11.83 0 0012.05 24c6.555 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface DonorCardProps {
  donor: {
    id?: number;
    full_name: string;
    blood_group: string;
    district: string;
    upazila: string;
    union_name?: string;
    total_donations: number;
    is_active: boolean;
    is_eligible?: boolean;
    next_eligible_date?: string;
    donation_type?: string;
    eligible_whole_blood?: boolean;
    eligible_platelets?: boolean;
    eligible_plasma?: boolean;
    eligible_types_count?: number;
    badges: string[];
    phone?: string;
    avatar_url?: string;
    total_referrals?: number;
    total_units?: number;
    hb_status?: "eligible" | "low_hb" | "not_tested";
    distance_km?: number | null;
    // Verification + presence (Phase 5)
    is_verified?: boolean | number;
    verification_status?: string;
    is_anonymous?: boolean | number;
    last_active_at?: string | null;
    created_at?: string | null;
    response_count?: number;
    response_total_ms?: number;
  };
}

function parseDateSafe(raw: string | Date | null | undefined): Date {
  if (!raw) return new Date(NaN);
  if (raw instanceof Date) return new Date(raw.getTime());
  let s = String(raw).trim();
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
  if (!/[Zz]|[+-]\d{2}:?\d{2}$|[+-]\d{2}$/.test(s)) s = s + "Z";
  return new Date(s);
}

const typeBadgeClass = (eligible: boolean | undefined) =>
  `px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold border inline-flex items-center gap-1 ${
    eligible
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60"
  }`;

export default function DonorCard({ donor }: DonorCardProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const isBn = locale === "bn";

  const [isWhatsAppAvailable, setIsWhatsAppAvailable] = useState(false);
  const [cardQrUrl, setCardQrUrl] = useState<string | null>(null);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string | null>(null);
  const [qrLinkCopied, setQrLinkCopied] = useState(false);
  const [copyingText, setCopyingText] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  const isClient = useClientSide();
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);
  const shareRef = useRef<HTMLDivElement>(null);
  const qrFrameRef = useRef<HTMLDivElement>(null);


  const donorShareUrl = isClient && donor.id
    ? `${window.location.origin}/${locale}/donors?donor=${donor.id}`
    : "https://trinomul-blood-bank.vercel.app/donors";

  useEffect(() => {
    if (donor.phone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsWhatsAppAvailable(true);
    }
  }, [donor.phone]);

  // Generate compact QR for inline display on the card.
  useEffect(() => {
    if (!donor.id) return;
    let active = true;
    QRCode.toDataURL(donorShareUrl, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setCardQrUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [donorShareUrl]);

  // Generate large gradient-recolor QR for the modal.
  useEffect(() => {
    if (!showQrModal) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQrModalDataUrl(null);

    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    QRCode.toDataURL(donorShareUrl, {
      margin: 2,
      width: size,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((dataUrl) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          // Red→rose diagonal gradient (same family as the brand).
          const stops: [number, number, number][] = [
            [220, 38, 38],
            [190, 18, 60],
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
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imageData, 0, 0);
          setQrModalDataUrl(canvas.toDataURL("image/png"));
        };
        img.src = dataUrl;
      })
      .catch(() => {});
  }, [showQrModal, donorShareUrl]);

  const downloadDataUrl = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadCard = useCallback(async () => {
    const node = shareRef.current?.firstElementChild as HTMLElement;
    if (!node) return;
    setDownloadingCard(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(donorShareUrl, {
        width: 1024,
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      // Inject QR into the hidden template via a data attribute hack:
      // We set it on the img element directly.
      const qrImg = node.querySelector("[data-qr-slot]") as HTMLImageElement | null;
      if (qrImg) qrImg.src = qrDataUrl;

      // Wait for the QR image to load.
      await new Promise((r) => setTimeout(r, 150));

      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        width: 1080,
        height: 1080,
        backgroundColor: "#ffffff",
        skipFonts: true,
      });

      const link = document.createElement("a");
      link.download = `donor-card-${donor.full_name.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(isBn ? "কার্ড ডাউনলোড হয়েছে" : "Card downloaded");
    } catch {
      toast.error(isBn ? "ডাউনলোড ব্যর্থ" : "Download failed");
    } finally {
      setDownloadingCard(false);
    }
  }, [donor.full_name, donorShareUrl, isBn]);

  const handleCall = () => {
    if (donor.phone) {
      if (donor.id) serverRecordContactClick(donor.id, "call").catch(() => {});
      window.location.href = `tel:${donor.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (donor.phone) {
      if (donor.id) serverRecordContactClick(donor.id, "whatsapp").catch(() => {});
      let phoneNumber = donor.phone.replace(/[^0-9]/g, "");
      if (phoneNumber.startsWith("880")) {
        // already international
      } else if (phoneNumber.startsWith("0")) {
        phoneNumber = "880" + phoneNumber.slice(1);
      } else if (phoneNumber.startsWith("1") && phoneNumber.length === 10) {
        phoneNumber = "880" + phoneNumber;
      }
      const message = encodeURIComponent(
        "Hello, I found your profile on Trinomul Blood Bank and I need blood donation assistance.",
      );
      const waUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      const a = document.createElement("a");
      a.href = waUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCopyText = async () => {
    setCopyingText(true);
    try {
      const text = await serverTranslateDonorText({
        fullName: donor.full_name,
        bloodGroup: donor.blood_group,
        district: donor.district,
        upazila: donor.upazila,
        phone: donor.phone || null,
      });
      await navigator.clipboard.writeText(text);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    } catch (e) {
      toast.error(isBn ? "কপি ব্যর্থ" : "Copy failed");
    }
    setCopyingText(false);
  };

  const typeCount = donor.eligible_types_count ?? 0;

  // Phase 5: verification + presence derived values
  const isVerified = Boolean(donor.is_verified);
  const isAnonymous = Boolean(donor.is_anonymous);
  const displayName = isAnonymous ? "Anonymous Donor" : donor.full_name;
  const donorSinceYear = (() => {
    if (!donor.created_at) return null;
    const d = parseDateSafe(donor.created_at);
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  })();
  const presence = (() => {
    if (!donor.last_active_at) return null;
    try {
      const last = parseDateSafe(donor.last_active_at).getTime();
      if (Number.isNaN(last)) return null;
      const diffMs = now - last;
      if (diffMs < 0) return null;

      const min = Math.floor(diffMs / 60000);
      const hr = Math.floor(diffMs / 3600000);
      const day = Math.floor(diffMs / 86400000);

      if (min < 2) return { color: "bg-green-500", ring: "ring-green-400", label: isBn ? "এখন সক্রিয়" : "Active now", dot: "bg-green-500" };
      if (min < 15) return { color: "bg-green-500", ring: "ring-green-400", label: isBn ? `${min} মিনিট আগে সক্রিয়` : `Active ${min}m ago`, dot: "bg-green-500" };
      if (min < 60) return { color: "bg-green-400", ring: "ring-green-300", label: isBn ? `${min} মিনিট আগে সক্রিয়` : `Active ${min}m ago`, dot: "bg-green-400" };
      if (hr < 24) return { color: "bg-amber-400", ring: "ring-amber-300", label: isBn ? `${hr} ঘণ্টা আগে সর্বশেষ` : `Last seen ${hr}h ago`, dot: "bg-amber-400" };
      if (day < 7) return { color: "bg-slate-400", ring: "ring-slate-300", label: isBn ? `${day} দিন আগে সর্বশেষ` : `Last seen ${day}d ago`, dot: "bg-slate-400" };
      return { color: "bg-slate-300", ring: "ring-slate-200", label: isBn ? "অফলাইন" : "Offline", dot: "bg-slate-300" };
    } catch {
      return null;
    }
  })();
  const avgResponseMin = (() => {
    const count = donor.response_count ?? 0;
    const totalMs = donor.response_total_ms ?? 0;
    if (count === 0) return null;
    return Math.round(totalMs / count / 60000); // minutes
  })();

  return (
    <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-[0_3px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.12)] transition-all group">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="relative">
          <div className={`
            flex items-center justify-center
            ${donor.avatar_url && !isAnonymous
              ? "text-red-600 bg-gradient-to-br from-red-100 to-red-200 group-hover:from-red-600 group-hover:to-red-700 group-hover:text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full ring-2 ring-red-500 ring-offset-[1.5px] ring-offset-white"
              : "text-white bg-gradient-to-br from-red-500 to-red-700 group-hover:from-red-600 group-hover:to-red-800 w-11 h-11 sm:w-12 sm:h-12 rounded-full ring-2 ring-red-200 ring-offset-[1.5px] ring-offset-white"
            }
            transition-all shadow-sm overflow-hidden
          `}>
            {donor.avatar_url && !isAnonymous ? (
              <img
                src={donor.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : isAnonymous ? (
              <Heart className="w-5 h-5 sm:w-6 h-6" />
            ) : (
              <span className="text-sm sm:text-base font-bold select-none">
                {(donor.full_name || "?")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("")}
              </span>
            )}
          </div>
          {presence && (
            <div className="absolute -bottom-0.5 -right-0.5 group/presence">
              <span className={`block w-3.5 h-3.5 rounded-full ring-2 ring-white ${presence.dot}`} />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap text-[10px] font-medium text-white bg-slate-800 px-2 py-1 rounded-md opacity-0 group-hover/presence:opacity-100 transition-opacity pointer-events-none z-20">
                {presence.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl sm:text-3xl font-black" style={{ color: '#dc2626' }}>
            {donor.blood_group}
          </span>
          <div className="mt-1 flex flex-col items-start gap-1">
            {typeCount === 0 ? (
              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600 leading-none">
                <Clock className="w-2.5 h-2.5" />
                {isBn ? "কুলিং ডাউন" : "Cooling Down"}
              </span>
            ) : (
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider leading-none ${donor.is_active ? "text-green-500" : "text-slate-400"}`}
              >
                {typeCount > 0
                  ? `${isBn ? "✓ উপলব্ধ" : "✓ Available"}${typeCount < 3 ? ` (${typeCount}/3)` : ""}`
                  : donor.is_active
                    ? (isBn ? "উপলব্ধ" : "Available")
                    : (isBn ? "অনুপলব্ধ" : "Unavailable")}
              </span>
            )}
            {donor.hb_status && (
              <span
                className={`inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none ${
                  donor.hb_status === "eligible"
                    ? "bg-green-100 text-green-700"
                    : donor.hb_status === "low_hb"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
                title={
                  donor.hb_status === "eligible"
                    ? (isBn ? "হিমোগ্লোবিন যাচাইকৃত" : "Hemoglobin verified")
                    : donor.hb_status === "low_hb"
                      ? (isBn ? "হিমোগ্লোবিন নিরাপদ সীমার নিচে" : "Hemoglobin is below the safe donation threshold")
                      : (isBn ? "হিমোগ্লোবিন এখনো পরীক্ষিত নয়" : "Hemoglobin has not been tested yet")
                }
              >
                {donor.hb_status === "eligible" ? (
                  <span className="inline-flex items-center gap-1">
                    <HeartPulse className="h-3 w-3" aria-hidden="true" />
                    {isBn ? "Hb যাচাইকৃত" : "Hb Verified"}
                  </span>
                ) : donor.hb_status === "low_hb" ? (
                  <span className="inline-flex items-center gap-1">
                    <HeartPulse className="h-3 w-3" aria-hidden="true" />
                    {isBn ? "কম Hb - স্থগিত" : "Low Hb - Deferred"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <HeartPulse className="h-3 w-3" aria-hidden="true" />
                    {isBn ? "Hb পরীক্ষিত নয়" : "Hb Not Tested"}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-0.5 sm:mb-1 truncate flex items-center gap-1.5">
        {displayName}
        {isVerified && (
          <span title="Verified donor" className="flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </span>
        )}
      </h3>

      <div className="flex items-center gap-1.5 text-slate-600 text-xs sm:text-sm mb-2 sm:mb-3 font-medium flex-wrap">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">
          {(() => {
            const d = getDistrictById(String(donor.district || "").toLowerCase());
            const u = getUpazilaById(String(donor.upazila || "").toLowerCase());
            const unionObj = donor.union_name ? getUnionById(String(donor.union_name).toLowerCase()) : undefined;
            const distLabel = d ? (isBn ? d.name_bn : d.name_en) : donor.district;
            const upaLabel = u ? (isBn ? u.name_bn : u.name_en) : donor.upazila;
            const unionLabel = unionObj ? (isBn ? unionObj.name_bn : unionObj.name_en) : donor.union_name;
            return unionLabel ? `${upaLabel} (${unionLabel}), ${distLabel}` : `${upaLabel}, ${distLabel}`;
          })()}
        </span>
        {typeof donor.distance_km === "number" && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold whitespace-nowrap shrink-0">
            <Navigation className="w-2.5 h-2.5" />
            {donor.distance_km < 1
              ? `${Math.round(donor.distance_km * 1000)} m`
              : `${donor.distance_km.toFixed(1)} km`}
          </span>
        )}
      </div>

      {/* === Per-Type Availability Badges === */}
      <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">
        <span className={typeBadgeClass(donor.eligible_whole_blood)}>
          🩸 {isBn ? "সম্পূর্ণ রক্ত" : "Whole Blood"}
        </span>
        <span className={typeBadgeClass(donor.eligible_platelets)}>
          🔴 {isBn ? "প্লাটিলেট" : "Platelets"}
        </span>
        <span className={typeBadgeClass(donor.eligible_plasma)}>💉 {isBn ? "প্লাজমা" : "Plasma"}</span>
      </div>

      {!donor.eligible_whole_blood && typeCount > 0 && (() => {
        const canDonate: string[] = [];
        if (donor.eligible_platelets) canDonate.push(isBn ? "প্লাটিলেট" : "Platelets");
        if (donor.eligible_plasma) canDonate.push(isBn ? "প্লাজমা" : "Plasma");
        return (
          <div className="flex items-center gap-1.5 p-2 bg-blue-50 rounded-lg border border-blue-200 mb-3 sm:mb-4">
            <Droplet className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <p className="text-[10px] sm:text-xs font-medium text-blue-700">
              {isBn
                ? `সম্পূর্ণ রক্ত নয় — শুধু ${canDonate.join(", ")} দিতে পারবেন`
                : `Not whole blood — can only donate ${canDonate.join(", ")}`}
            </p>
          </div>
        );
      })()}

      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        {donor.badges.map((badge, i) => (
          <span
            key={i}
            className="bg-white/80 text-green-800 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-green-200 shadow-sm"
          >
            {badge}
          </span>
        ))}
      </div>

      {typeCount === 0 && donor.next_eligible_date && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800">
              {isBn ? "কুলিং ডাউন (" : "Cooling Down ("}
              {donor.donation_type === "platelets"
                ? (isBn ? "প্লাটিলেট" : "Platelets")
                : donor.donation_type === "plasma"
                  ? (isBn ? "প্লাজমা" : "Plasma")
                  : (isBn ? "সম্পূর্ণ রক্ত" : "Whole Blood")}
              )
            </p>
            <p className="text-[10px] text-amber-600">
              {isBn ? "এই তারিখ থেকে উপযুক্ত: " : "Eligible from: "}
              {new Date(donor.next_eligible_date).toLocaleDateString(isBn ? "bn-BD" : "en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between pt-3 sm:pt-4 border-t border-gray-100 gap-2">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            {(donor.total_donations ?? 0) > 0 && (
              <>
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 fill-red-500" />
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 whitespace-nowrap">
                  {donor.total_donations} Donations
                </span>
              </>
            )}
            {(donor.total_referrals ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] sm:text-[10px] font-bold whitespace-nowrap">
                <Handshake className="w-2.5 h-2.5" />
                {donor.total_referrals} Referrals
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-slate-500 font-medium">
            {donorSinceYear != null && <span>Since {donorSinceYear}</span>}
            {avgResponseMin !== null && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                ~{avgResponseMin}m resp
              </span>
            )}
            {(donor.total_units ?? 0) > 0 && <span>~{donor.total_units} lives</span>}
          </div>
        </div>
        {!isAnonymous && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleCall}
              className="border-2 border-red-600 text-red-600 font-bold text-xs hover:bg-red-600 hover:text-white transition-all flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl active:scale-95 whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t("contact")}
            </button>
            {isWhatsAppAvailable && (
              <button
                onClick={handleWhatsApp}
                className="border-2 border-[#25D366] text-[#25D366] font-bold text-xs hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center px-2 sm:px-2.5 py-1.5 rounded-xl active:scale-95"
                title="WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Engagement actions — bookmark, save contact, share, download card, QR */}
      {!isAnonymous && donor.id && (
        <div className="flex items-center justify-between gap-2.5 mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <BookmarkDonorButton donorId={donor.id} compact />
            <SaveContactButton
              fullName={donor.full_name}
              phone={donor.phone}
              bloodGroup={donor.blood_group}
              district={donor.district}
              upazila={donor.upazila}
              compact
            />
            <ShareProfileButton
              donorName={donor.full_name}
              bloodGroup={donor.blood_group}
              district={donor.district}
              url={donorShareUrl}
              compact
            />
            <button
              type="button"
              onClick={handleDownloadCard}
              disabled={downloadingCard}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              title={isBn ? "কার্ড ডাউনলোড" : "Download Card"}
            >
              {downloadingCard ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyText}
              disabled={copyingText}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              title={isBn ? "টেক্সট কপি" : "Copy Text"}
            >
              {copyingText ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : textCopied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          {cardQrUrl && (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="group/qr relative w-8 h-8 bg-white rounded-md border border-slate-200 p-0.5 shrink-0 hover:border-emerald-400 hover:ring-2 hover:ring-emerald-300 transition-all cursor-pointer"
              title={isBn ? "QR কোড দেখুন" : "View QR Code"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardQrUrl} alt="Donor QR" className="w-full h-full object-contain" />
              <svg
                width="18"
                height="18"
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
                  fontSize={donor.blood_group && donor.blood_group.length > 2 ? "4" : "5"}
                  fontWeight="900"
                  fill="#dc2626"
                >
                  {donor.blood_group}
                </text>
              </svg>
              {/* Expand icon — appears on hover */}
              <Maximize2 className="absolute -top-1 -right-1 w-3.5 h-3.5 text-emerald-600 bg-white rounded-full p-0.5 shadow-sm ring-1 ring-emerald-200 opacity-0 group-hover/qr:opacity-100 transition-opacity z-10" />
              {/* Pulse ring — draws attention */}
              <span className="absolute inset-0 rounded-md ring-1 ring-emerald-400/40 animate-pulse pointer-events-none" />
            </button>
          )}
        </div>
      )}

      {/* Hidden 1080×1080 share template — captured by handleDownloadCard */}
      {!isAnonymous && (
        <div ref={shareRef} className="absolute -z-50 pointer-events-none" style={{ left: -99999, top: 0 }}>
          <DonorShareImage
            fullName={displayName}
            bloodGroup={donor.blood_group}
            district={donor.district}
            upazila={donor.upazila}
            totalDonations={donor.total_donations}
            donorSinceYear={donorSinceYear}
            isVerified={isVerified}
            avgResponseMin={avgResponseMin}
            phone={donor.phone || null}
            siteOrigin={isClient ? window.location.origin : "trinomul-blood-bank.vercel.app"}
            qrDataUrl={null}
            labels={{
              verifiedBadge: isBn ? "যাচাইকৃত" : "Verified",
              donations: isBn ? "উপহার" : "Donations",
              donorSince: isBn ? "দাতা যখন থেকে" : "Donor Since",
              location: isBn ? "এলাকা" : "District",
              scanToView: isBn ? "স্ক্যান করে দেখুন" : "Scan to view",
              responseTime: isBn ? "সাড়া সময়" : "Response",
              callNow: isBn ? "এখন কল করুন" : "Call Now",
              donorProfile: isBn ? "ডোনার প্রোফাইল" : "Donor Profile",
            }}
          />
        </div>
      )}

      {/* QR Modal — popup with large QR + download */}
      {showQrModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <QrCodeIcon className="w-5 h-5 text-slate-600" />
                {isBn ? "ডোনার QR কোড" : "Donor QR Code"}
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-sm text-slate-500 text-center mb-4">
              {isBn ? "স্ক্যান করে ডোনার প্রোফাইল দেখুন" : "Scan to view donor profile"}
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              {qrModalDataUrl ? (
                <div ref={qrFrameRef} className="relative w-48 h-48 mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrModalDataUrl} alt="QR Code" className="w-48 h-48" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="72" height="72" viewBox="0 0 32 32" aria-hidden="true">
                      <path
                        d="M16,6 C12.5,10.5 9.5,14 9.5,17.5 C9.5,21.1 12.4,24 16,24 C19.6,24 22.5,21.1 22.5,17.5 C22.5,14 19.5,10.5 16,6Z"
                        fill="#ffffff"
                        stroke="#dc2626"
                        strokeWidth="0.5"
                        opacity="0.95"
                      />
                      <text
                        x="16"
                        y="19"
                        textAnchor="middle"
                        fontSize={donor.blood_group && donor.blood_group.length > 2 ? "4.5" : "5.5"}
                        fontWeight="900"
                        fill="#dc2626"
                      >
                        {donor.blood_group}
                      </text>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono break-all text-center max-w-full mb-3">
              {donorShareUrl}
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(donorShareUrl);
                    setQrLinkCopied(true);
                    setTimeout(() => setQrLinkCopied(false), 1600);
                  } catch {
                    /* ignore */
                  }
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {qrLinkCopied
                  ? (isBn ? "✓ কপি হয়েছে" : "✓ Copied")
                  : (isBn ? "লিংক কপি" : "Copy Link")}
              </button>
              <button
                onClick={async () => {
                  const fname = `donor-qr-${donor.id ?? "card"}.png`;
                  if (qrFrameRef.current) {
                    try {
                      const dataUrl = await toPng(qrFrameRef.current, {
                        cacheBust: true,
                        pixelRatio: 3,
                        backgroundColor: undefined,
                        skipFonts: true,
                      });
                      downloadDataUrl(dataUrl, fname);
                    } catch {
                      if (qrModalDataUrl) downloadDataUrl(qrModalDataUrl, fname);
                    }
                  } else if (qrModalDataUrl) {
                    downloadDataUrl(qrModalDataUrl, fname);
                  }
                }}
                disabled={!qrModalDataUrl}
                className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {isBn ? "ডাউনলোড" : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
