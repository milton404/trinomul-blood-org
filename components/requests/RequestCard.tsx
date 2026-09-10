"use client";

import { isValidBangladeshCoordinatePair } from "@/lib/location-coordinates";
import { formatWhenNeededDynamic } from "@/lib/utils/when-needed";
import { useTranslations } from "next-intl";
import {
  Phone,
  MapPin,
  Clock,
  Hospital,
  MessageCircle,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  Search,
  Navigation,
  QrCode,
  Droplet,
  HeartHandshake,
  Radar,
  Calendar,
  Copy,
  Check,
  Share2,
  Download,
  Facebook,
  Link2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { useLocale } from "next-intl";
import { getUpazilaById, getDistrictById, getUnionById } from "@/lib/constants/rangpur";
import {
  serverGetDonorsWithStats,
  serverMarkRequestFulfilled,
  serverSearchReferrerCandidates,
  serverGetBnShareText,
  serverTranslateAndCacheBn,
  serverGetBnImageFields,
} from "@/lib/db-actions";
import RequestShareImage from "./RequestShareImage";
import BengaliShareImage from "./BengaliShareImage";
import QuickAddDonor from "@/components/admin/QuickAddDonor";
import { useClientSide } from "@/lib/hooks/useClientSide";

const QR_GRADIENTS: { stops: [number, number, number][] }[] = [
  { stops: [[16, 185, 129], [20, 184, 166], [220, 38, 38]] },     // emerald → teal → red
  { stops: [[220, 38, 38], [244, 63, 94], [168, 85, 247]] },      // red → rose → violet
  { stops: [[245, 158, 11], [251, 113, 133], [168, 85, 247]] },   // amber → rose → violet
  { stops: [[59, 130, 246], [99, 102, 241], [168, 85, 247]] },    // blue → indigo → violet
  { stops: [[16, 185, 129], [34, 197, 94], [220, 38, 38]] },      // emerald → green → red
  { stops: [[168, 85, 247], [217, 70, 239], [220, 38, 38]] },     // violet → fuchsia → red
  { stops: [[14, 165, 233], [6, 182, 212], [16, 185, 129]] },     // sky → cyan → emerald
  { stops: [[220, 38, 38], [251, 146, 60], [245, 158, 11]] },     // red → orange → amber
  { stops: [[124, 58, 237], [236, 72, 153], [251, 113, 133]] },   // violet → pink → rose
  { stops: [[16, 185, 129], [59, 130, 246], [124, 58, 237]] },    // emerald → blue → violet
  { stops: [[251, 191, 36], [245, 158, 11], [220, 38, 38]] },        // yellow → amber → red
  { stops: [[34, 197, 94], [16, 185, 129], [14, 165, 233]] },     // green → emerald → sky
];

function pickQrGradient(seed: string | number | undefined) {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return QR_GRADIENTS[h % QR_GRADIENTS.length];
}


/**
 * Parse a SQLite `created_at` string (stored as UTC by `datetime('now')`)
 * into a Date. The raw format is `YYYY-MM-DD HH:MM:SS` with no timezone
 * marker, so we must append `Z` so JS treats it as UTC. The browser will
 * then display it in the user's local timezone (BD users see BD time,
 * others see their own local time).
 */
function parseSqliteUtc(iso: string): Date {
  if (!iso) return new Date(NaN);
  let s = String(iso).trim();
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
  if (!/[Zz]|[+-]\d{2}:?\d{2}$/.test(s)) s = s + "Z";
  return new Date(s);
}

function formatPostedAt(iso: string): string {
  const d = parseSqliteUtc(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  const showYear = d.getFullYear() !== new Date().getFullYear();
  return format(d, showYear ? "MMM d, yyyy" : "MMM d");
}

const WHEN_NEEDED_LABELS: Record<string, { en: string; bn: string }> = {
  now: { en: "Now", bn: "এখনই" },
  today: { en: "Today", bn: "আজ" },
  tomorrow: { en: "Tomorrow", bn: "আগামীকাল" },
  day_after: { en: "Day After Tomorrow", bn: "পরশু" },
  within_3_days: { en: "Within 3 Days", bn: "৩ দিনের মধ্যে" },
  within_week: { en: "Within a Week", bn: "এক সপ্তাহের মধ্যে" },
  specific_date: { en: "Specific Date", bn: "নির্দিষ্ট তারিখ" },
  emergency: { en: "Emergency", bn: "জরুরি" },
};

function formatWhenNeeded(value: string, locale: string): string {
  if (!value) return "—";
  const entry = WHEN_NEEDED_LABELS[value];
  if (entry) return locale === "bn" ? entry.bn : entry.en;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface RequestCardProps {
  request: {
    id?: number;
    patient_name: string;
    blood_group: string;
    hospital_name: string;
    hospital_address?: string | null;
    district: string;
    upazila: string;
    union_name?: string;
    urgency_level: string;
    when_needed: string;
    needed_date?: string | null;
    needed_time?: string | null;
    created_at: string;
    units_needed: number;
    reason?: string;
    phone?: string;
    contact_number?: string;
    alternative_number?: string | null;
    whatsapp_number?: string | null;
    lat?: number | null;
    lng?: number | null;
    tracking_code?: string | null;
    current_status?: string | null;
    status?: string;
    is_last_chance?: boolean;
    show_fulfilled_badge?: number | boolean | null;
    admin_notice?: string | null;
    /** Distance from the user / search origin in km — shown as a chip when set. */
    distance_km?: number | null;
    view_count?: number | null;
    patient_hb_level?: number | null;
  };
}

function ReasonText({ reason }: { reason?: string }) {
  const [isMultiLine, setIsMultiLine] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsMultiLine(el.scrollHeight > el.clientHeight);
    }
  }, [reason]);

  if (!reason) return null;

  return (
    <div
      className="mb-3 rounded-lg px-3 py-1.5 h-[44px] overflow-hidden bg-slate-50 border-l-2 border-slate-300"
      aria-hidden="false"
    >
      <p
        ref={textRef}
        className={`text-slate-700 font-medium break-words line-clamp-2 ${
          isMultiLine ? "text-[11px]" : "text-[13px]"
        }`}
      >
        {reason}
      </p>
    </div>
  );
}

export default function RequestCard({ request }: RequestCardProps) {
  const t = useTranslations("common");
  const tMap = useTranslations("map");
  const locale = useLocale();
  const isBn = locale === "bn";
  const isClient = useClientSide();
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [donorSearch, setDonorSearch] = useState("");
  const [donors, setDonors] = useState<any[]>([]);
  const [selectedDonorId, setSelectedDonorId] = useState<number | null>(null);
  const [recordType, setRecordType] = useState("whole_blood");
  const [recordUnits, setRecordUnits] = useState("1");
  const [recording, setRecording] = useState(false);
  // Referrer (the person who helped find the donor)
  const [refMode, setRefMode] = useState<"none" | "user" | "text">("none");
  const [refSearch, setRefSearch] = useState("");
  const [refCandidates, setRefCandidates] = useState<any[]>([]);
  const [selectedReferrerId, setSelectedReferrerId] = useState<number | null>(null);
  const [refName, setRefName] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateStep, setTranslateStep] = useState(0);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string | null>(null);
  const qrFrameRef = useRef<HTMLDivElement>(null);
  const [viewCount, setViewCount] = useState<number>(request.view_count ?? 0);
  const viewIncrementedRef = useRef(false);

  useEffect(() => {
    if (viewIncrementedRef.current || !request.id) return;
    viewIncrementedRef.current = true;
    setViewCount((c) => c + 1);
    fetch(`/api/requests/${request.id}/view`, { method: "POST" }).catch(() => {});
  }, [request.id]);
  const [qrMode, setQrMode] = useState<"track" | "share">("track");
  const [qrLinkCopied, setQrLinkCopied] = useState(false);
  const [inlineQrUrl, setInlineQrUrl] = useState<string | null>(null);
  const [bnImageFields, setBnImageFields] = useState<{
    patientName: string;
    bloodGroup: string;
    unitsNeeded: string;
    hospitalName: string;
    locationText: string;
    whenNeededText: string;
    urgencyLabel: string;
    reason: string;
  } | null>(null);
  const [bnImageText, setBnImageText] = useState<string | null>(null);

  useEffect(() => {
    if (!translating) {
      setTranslateStep(0);
      return;
    }
    const interval = setInterval(() => {
      setTranslateStep((s) => (s + 1) % 3);
    }, 800);
    return () => clearInterval(interval);
  }, [translating]);

  useEffect(() => {
    if (!showShareMenu) return;
    const handler = () => setShowShareMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showShareMenu]);


  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);

  const copyTrackingCode = async () => {
    const code = request.tracking_code || (request.id ? String(request.id) : null);
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1600);
    } catch {}
  };

  // Contact numbers
  const primaryPhone = request.phone || request.contact_number;
  const altPhone = request.alternative_number || null;
  const whatsappNumber = request.whatsapp_number || null;

  // WhatsApp button: only show if a dedicated WhatsApp number was provided
  const showWhatsApp = !!whatsappNumber;
  // Alternative contact: only show if NO WhatsApp number (WhatsApp takes priority)
  const showAlternative = !showWhatsApp && !!altPhone;

  const handleCall = () => {
    if (primaryPhone) {
      window.location.href = `tel:${primaryPhone}`;
    }
  };

  const handleCallAlt = () => {
    if (altPhone) {
      window.location.href = `tel:${altPhone}`;
    }
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
      let cleanedNumber = whatsappNumber.replace(/[^0-9]/g, "");
      if (cleanedNumber.startsWith("880")) {
        // already international
      } else if (cleanedNumber.startsWith("0")) {
        cleanedNumber = "880" + cleanedNumber.slice(1);
      } else if (cleanedNumber.startsWith("1") && cleanedNumber.length === 10) {
        cleanedNumber = "880" + cleanedNumber;
      }
      const message = encodeURIComponent(
        "Hello, I saw your blood request on Trinomul Blood Bank and I would like to help.",
      );
      const waUrl = `https://wa.me/${cleanedNumber}?text=${message}`;
      const a = document.createElement("a");
      a.href = waUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  useEffect(() => {
    if (showRecordModal) {
      serverGetDonorsWithStats().then((data: any) => {
        setDonors(data.filter((d: any) => d.blood_group === request.blood_group && d.is_eligible) || []);
      });
    }
  }, [showRecordModal]);

  // Debounced referrer (registered user) search
  useEffect(() => {
    if (refMode !== "user" || !refSearch.trim()) {
      setRefCandidates([]);
      return;
    }
    const timer = setTimeout(() => {
      serverSearchReferrerCandidates(refSearch.trim())
        .then((rows: any) => setRefCandidates(rows || []))
        .catch(() => setRefCandidates([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [refMode, refSearch]);

  const handleRecordDonation = async () => {
    if (!selectedDonorId || !request.id) return;
    setRecording(true);
    try {
      await serverMarkRequestFulfilled({
        requestId: request.id,
        donorId: selectedDonorId,
        donationType: recordType,
        units: parseInt(recordUnits) || 1,
        referrerProfileId: refMode === "user" ? selectedReferrerId : null,
        referrerName: refMode === "text" && refName.trim() ? refName.trim() : null,
        referrerPhone: refMode === "text" && refPhone.trim() ? refPhone.trim() : null,
        actorEmail: "public",
      });
      setShowRecordModal(false);
      setSelectedDonorId(null);
      setDonorSearch("");
      setRefMode("none");
      setRefSearch("");
      setSelectedReferrerId(null);
      setRefName("");
      setRefPhone("");
      alert(t("donation_saved") || "✓ Donation recorded successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to record");
    }
    setRecording(false);
  };

  const filteredDonors = donors.filter((d: any) =>
    !donorSearch ||
    (d.full_name_en || "").toLowerCase().includes(donorSearch.toLowerCase()) ||
    (d.full_name_bn || "").toLowerCase().includes(donorSearch.toLowerCase()) ||
    (d.phone || "").includes(donorSearch)
  );

  // Urgency config — unified styling with localized labels
  const urgencyConfig: Record<string, { en: string; bn: string; badge: string; bar: string; dot: string }> = {
    critical: {
      en: "Critical",
      bn: "মারাত্মক",
      badge: "bg-red-50 text-red-700 border border-red-200",
      bar: "bg-red-500",
      dot: "bg-red-500",
    },
    urgent: {
      en: "Urgent",
      bn: "জরুরী",
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      bar: "bg-amber-500",
      dot: "bg-amber-500",
    },
    normal: {
      en: "Normal",
      bn: "স্বাভাবিক",
      badge: "bg-slate-50 text-slate-600 border border-slate-200",
      bar: "bg-slate-300",
      dot: "bg-slate-400",
    },
  };

  const statusConfig: Record<string, { en: string; bn: string; className: string }> = {
    submitted: { en: "Submitted", bn: "জমা হয়েছে", className: "bg-blue-50 text-blue-600" },
    matching: { en: "Matching", bn: "দাতা খুঁজছে", className: "bg-amber-50 text-amber-600" },
    donor_found: { en: "Donor Found", bn: "দাতা পাওয়া গেছে", className: "bg-emerald-50 text-emerald-600" },
    donating: { en: "Donating", bn: "দান চলছে", className: "bg-purple-50 text-purple-600" },
    fulfilled: { en: "Fulfilled", bn: "সম্পন্ন", className: "bg-emerald-100 text-emerald-700" },
    cancelled: { en: "Cancelled", bn: "বাতিল", className: "bg-slate-100 text-slate-500" },
    expired: { en: "Expired", bn: "মেয়াদোত্তীর্ণ", className: "bg-slate-100 text-slate-500" },
  };

  // Build Google Maps directions URL.
  // Prefer hospital name + address text (as entered in the request form) so
  // Google can geocode the exact place. Fall back to lat/lng if no text.
  const hasCoords = isValidBangladeshCoordinatePair(request.lat, request.lng);
  const hospitalText = [request.hospital_name, request.hospital_address]
    .filter(Boolean)
    .join(", ")
    .trim();
  const directionsUrl = hospitalText
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hospitalText)}`
    : hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`
      : null;

  const trackingId = request.tracking_code || (request.id ? String(request.id) : null);
  const trackingUrl = trackingId ? `/${locale}/track/${trackingId}` : null;
  const currentStatus = request.current_status || "submitted";
  const statusInfo = statusConfig[currentStatus] || statusConfig.submitted;
  const statusLabel = locale === "bn" ? statusInfo.bn : statusInfo.en;
  const urgency = urgencyConfig[request.urgency_level] || urgencyConfig.normal;
  const urgencyLabel = locale === "bn" ? urgency.bn : urgency.en;
  const unitsLabel =
    locale === "bn"
      ? `${request.units_needed} ইউনিট`
      : `${request.units_needed} ${request.units_needed > 1 ? "units" : "unit"}`;

  // "Needed by" text — single source of truth for the card display and the exported share image
  const neededTimeText = request.needed_time
    ? new Date(`2000-01-01T${request.needed_time}`).toLocaleTimeString(
        locale === "bn" ? "bn-BD" : "en-US",
        { hour: "numeric", minute: "2-digit", hour12: true },
      )
    : "";
  const whenNeededText = formatWhenNeededDynamic(
    request.when_needed,
    request.created_at,
    request.needed_date,
    request.needed_time,
    locale,
  );

  // Lifecycle visuals
  const isFulfilled = request.status === "fulfilled";
  const showSeal =
    isFulfilled &&
    request.show_fulfilled_badge !== 0 &&
    request.show_fulfilled_badge !== false;
  const isExpired = request.status === "expired";
  const showExpiredSeal = isExpired && !isFulfilled;
  const isLastChance = !!request.is_last_chance && !isFulfilled && !isExpired;

  const siteOrigin = isClient ? window.location.origin : "";
  const absoluteTrackingUrl = trackingUrl ? `${siteOrigin}${trackingUrl}` : "";
  // Dedicated per-card link — opens the requests page with this exact card in a popup
  const cardShareUrl = trackingId
    ? `${siteOrigin}/${locale}/requests?req=${encodeURIComponent(trackingId)}`
    : "";

  useEffect(() => {
    if (!showQrModal) return;
    setQrMode("share");
    setQrModalDataUrl(null);
  }, [showQrModal]);

  useEffect(() => {
    if (!showQrModal) return;
    const url = qrMode === "track" ? absoluteTrackingUrl : cardShareUrl;
    if (!url || qrModalDataUrl) return;

    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    QRCode.toDataURL(url, {
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

          const grad = pickQrGradient(trackingId || request.id);
          const stops = grad.stops;
          const lastIdx = stops.length - 1;

          const centerRadius = 40;
          const centerX = size / 2;
          const centerY = size / 2;
          const radiusSq = centerRadius * centerRadius;

          for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % size;
            const y = Math.floor((i / 4) / size);

            const dx = x - centerX;
            const dy = y - centerY;
            if (dx * dx + dy * dy < radiusSq) {
              data[i + 3] = 0;
              continue;
            }

            const isDark = data[i] + data[i + 1] + data[i + 2] < 384;
            if (isDark) {
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
  }, [showQrModal, qrMode, qrModalDataUrl, absoluteTrackingUrl, cardShareUrl, trackingId, request.id]);

  useEffect(() => {
    if (!cardShareUrl || inlineQrUrl) return;
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    QRCode.toDataURL(cardShareUrl, {
      margin: 1,
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

          const grad = pickQrGradient(trackingId || request.id);
          const stops = grad.stops;
          const lastIdx = stops.length - 1;

          const centerRadius = 12;
          const centerX = size / 2;
          const centerY = size / 2;
          const radiusSq = centerRadius * centerRadius;

          for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % size;
            const y = Math.floor((i / 4) / size);

            const dx = x - centerX;
            const dy = y - centerY;
            if (dx * dx + dy * dy < radiusSq) {
              data[i + 3] = 0;
              continue;
            }

            const isDark = data[i] + data[i + 1] + data[i + 2] < 384;
            if (isDark) {
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
          setInlineQrUrl(canvas.toDataURL("image/png"));
        };
        img.src = dataUrl;
      })
      .catch(() => {});
  }, [cardShareUrl, inlineQrUrl, trackingId, request.id]);

  const buildShareText = () => {
    const parts = [
      `🩸 Blood Request: ${request.patient_name} needs ${request.blood_group}`,
      `🏥 ${request.hospital_name}, ${request.upazila}, ${request.district}`,
    ];
    if (request.patient_hb_level != null) parts.push(`🩻 Hb: ${request.patient_hb_level} g/dL`);
    if (request.reason) parts.push(`📝 ${request.reason}`);
    parts.push(`⏰ Needed: ${formatWhenNeeded(request.when_needed, "en")}`);
    if (primaryPhone) parts.push(`📞 ${primaryPhone}`);
    return parts.join("\n");
  };

  const handleShare = async () => {
    const link = cardShareUrl || absoluteTrackingUrl;
    if (!link) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${request.patient_name} — Blood Request`,
          url: link,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1600);
    } catch {}
  };

  const handleCopyText = async () => {
    if (request.id) {
      try {
        const cached = await serverGetBnShareText(request.id);
        if (cached) {
          const text = cardShareUrl ? `${cached}\n\n🔗 ${cardShareUrl}` : cached;
          await navigator.clipboard.writeText(text);
          setTextCopied(true);
          setTimeout(() => setTextCopied(false), 2000);
          return;
        }
      } catch {}
    }

    setTranslating(true);
    try {
      const text = await serverTranslateAndCacheBn(request.id || 0, {
        patient_name: request.patient_name,
        blood_group: request.blood_group,
        units_needed: request.units_needed,
        reason: request.reason || null,
        hospital_name: request.hospital_name,
        hospital_address: request.hospital_address || null,
        district: request.district,
        upazila: request.upazila,
        when_needed: request.when_needed,
        needed_date: request.needed_date || null,
        needed_time: request.needed_time || null,
        phone: request.phone || request.contact_number || null,
        contact_number: request.contact_number || null,
whatsapp_number: request.whatsapp_number || null,
          patient_hb_level: request.patient_hb_level ?? null,
          share_link: cardShareUrl || null,
      });
      await navigator.clipboard.writeText(text);
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    } catch (e) {
      console.error("Bengali share text failed:", e);
      const fallback = buildShareText();
      try {
        await navigator.clipboard.writeText(fallback);
        setTextCopied(true);
        setTimeout(() => setTextCopied(false), 1600);
      } catch {}
    } finally {
      setTranslating(false);
    }
  };

  const shareText = buildShareText();
  const shareLink = cardShareUrl || absoluteTrackingUrl;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n🔗 ${shareLink}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`;
  const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareLink)}&app_id=0&redirect_uri=${encodeURIComponent(shareLink)}`;

  const downloadDataUrl = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadImage = async () => {
    const node = (shareRef.current?.firstElementChild as HTMLElement) || shareRef.current;
    if (!node) return;
    setDownloading(true);
    try {
      if (!bnImageFields) {
        const fields = await serverGetBnImageFields({
          request_id: request.id || undefined,
          patient_name: request.patient_name,
          blood_group: request.blood_group,
          units_needed: request.units_needed,
          reason: request.reason || null,
          hospital_name: request.hospital_name,
          hospital_address: request.hospital_address || null,
          district: request.district,
          upazila: request.upazila,
          when_needed: request.when_needed,
          needed_date: request.needed_date || null,
          needed_time: request.needed_time || null,
          urgency_level: request.urgency_level || null,
        });
        setBnImageFields(fields);
        await new Promise((r) => setTimeout(r, 150));
      }

      if (cardShareUrl && !qrDataUrl) {
        setQrDataUrl(
          await QRCode.toDataURL(cardShareUrl, {
            margin: 1,
            width: 1024,
            errorCorrectionLevel: "H",
            color: { dark: "#0f172a", light: "#ffffff" },
          }),
        );
        // Let React commit the QR <img> into the hidden template before capture
        await new Promise((r) => setTimeout(r, 100));
      }

      const dataUrl = await toPng(node, {
        cacheBust: true,
        // 3× for a crisp 3240×3240 export — survives Facebook compression
        pixelRatio: 3,
        width: 1080,
        height: 1080,
        backgroundColor: "#ffffff",
        // The template uses system fonts only; skipFonts avoids broken text
        // from partially-embedded webfonts in the SVG foreignObject clone
        skipFonts: true,
      });
      downloadDataUrl(dataUrl, `blood-request-${trackingId || request.id || "card"}.png`);
    } catch (err) {
      console.error("Image download failed", err);
      alert(t("image_failed") || "Could not generate the image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Auto-fit: long strings step down a font size so every card keeps the
  //    same footprint. Section heights below are fixed; text clamps inside.
  const nameLen = request.patient_name.length;
  const nameSizeClass = nameLen > 34 ? "text-[15px]" : nameLen > 20 ? "text-base" : "text-lg";
  const hospitalLen = request.hospital_name.length;
  const hospitalSizeClass = hospitalLen > 40 ? "text-xs" : hospitalLen > 26 ? "text-[12.5px] sm:text-[13px]" : "";

  return (
    <>
      <article className={`relative bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group h-full flex flex-col ${
        showSeal
          ? "border-emerald-300 ring-2 ring-emerald-200"
          : showExpiredSeal
            ? "border-rose-300 ring-2 ring-rose-200"
            : isLastChance
              ? "border-amber-300 ring-2 ring-amber-200"
              : "border-slate-200"
      }`}>
        {/* Top urgency bar */}
        <div className={`h-1 w-full ${showSeal ? "bg-emerald-500" : showExpiredSeal ? "bg-rose-500" : isLastChance ? "bg-amber-500" : urgency.bar}`} />

        {/* Completed seal — rotated stamp in the corner */}
        {showSeal && (
          <div className="absolute top-3 right-3 z-10 rotate-12 pointer-events-none select-none md:top-2 md:right-2 lg:top-3 lg:right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-emerald-500 bg-emerald-50/95 text-emerald-700 text-[11px] font-black uppercase tracking-wider shadow-sm md:px-2 md:py-0.5 md:text-[10px] lg:px-2.5 lg:py-1 lg:text-[11px]">
              <CheckCircle className="w-3.5 h-3.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" />
              {locale === "bn" ? "সম্পন্ন" : "Completed"}
            </span>
          </div>
        )}

        {/* Expired seal — rotated stamp in the corner (time up, not fulfilled) */}
        {showExpiredSeal && (
          <div className="absolute top-3 right-3 z-10 -rotate-6 pointer-events-none select-none md:top-2 md:right-2 lg:top-3 lg:right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 border-rose-500 bg-rose-50/95 text-rose-700 text-[11px] font-black uppercase tracking-wider shadow-sm md:px-2 md:py-0.5 md:text-[10px] lg:px-2.5 lg:py-1 lg:text-[11px]">
              <XCircle className="w-3.5 h-3.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" />
              {locale === "bn" ? "মেয়াদোত্তীর্ণ" : "Expired"}
            </span>
          </div>
        )}

        <div className="w-full px-3.5 pt-3 pb-2 flex flex-col flex-1">
          {/* Header: identity + blood group */}
          <header className="flex items-start justify-between gap-2.5 mb-2.5">
            <div className="min-w-0 flex-1">
              {/* Badges row — fixed 2-line window so every badge stays visible
                  and cards without extra badges keep the same height */}
              <div className="flex flex-wrap items-start content-start gap-1.5 mb-1.5 h-[46px] overflow-hidden">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${urgency.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                  {urgencyLabel}
                </span>
                {isLastChance && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    <Clock className="w-2.5 h-2.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5" />
                    {locale === "bn" ? "শেষ সুযোগ" : "Last Chance"}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusInfo.className}`}>
                  {statusLabel}
                  <span className="opacity-50">·</span>
                  <span>{unitsLabel}</span>
                </span>
              </div>
              <h3 className={`${nameSizeClass} font-bold text-slate-900 leading-snug break-words line-clamp-2`}>
                {request.patient_name}
              </h3>
              {request.tracking_code && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  #{request.tracking_code}
                  <button
                    onClick={copyTrackingCode}
                    className={`p-0.5 rounded transition-colors ${
                      codeCopied
                        ? "text-emerald-500"
                        : "text-slate-300 hover:text-red-500"
                    }`}
                    title="Copy tracking code"
                    aria-label="Copy tracking code"
                  >
                    {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              )}
            </div>
            {/* Blood group badge */}
            <div className="shrink-0 flex w-14 sm:w-16 h-14 sm:h-16 items-center justify-center bg-linear-to-br from-red-50 to-rose-100 rounded-2xl shadow-sm ring-1 ring-red-200/60">
              <span className="text-lg sm:text-xl font-black text-red-600 leading-none tracking-tighter">
                {request.blood_group}
              </span>
            </div>
          </header>

          {/* Info grid — always 2 columns so the card keeps the same compact
              height on every screen size. Each value gets a fixed 2-line
              window so rows never change height. */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-2.5">
            <div className="flex min-w-0 items-start gap-2 text-[13px] text-slate-800">
              <Hospital className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0 mt-0.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
              <span className={`font-semibold break-words line-clamp-2 min-h-[32px] ${hospitalSizeClass}`}>{request.hospital_name}</span>
            </div>
            <div className="flex min-w-0 items-start gap-2 text-[13px] text-slate-800">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0 mt-0.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
              <span className="font-semibold break-words line-clamp-2 min-h-[32px]">{(() => {
                const d = getDistrictById(String(request.district || "").toLowerCase());
                const u = getUpazilaById(String(request.upazila || "").toLowerCase());
                const un = request.union_name ? getUnionById(String(request.union_name).toLowerCase()) : undefined;
                const distLabel = d ? (isBn ? d.name_bn : d.name_en) : request.district;
                const upaLabel = u ? (isBn ? u.name_bn : u.name_en) : request.upazila;
                const unionLabel = un ? (isBn ? un.name_bn : un.name_en) : request.union_name;
                return unionLabel ? `${unionLabel}, ${upaLabel}, ${distLabel}` : `${upaLabel}, ${distLabel}`;
              })()}</span>
            </div>
            <div className="flex min-w-0 items-start gap-2 text-[11px] sm:text-[13px] text-slate-800">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0 mt-0.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
              <span className="break-words font-medium min-h-[32px]">
                {locale === "bn" ? "প্রয়োজন: " : "Needed: "}
                <span className="font-bold text-slate-900">{whenNeededText}</span>
              </span>
            </div>
            <div className="flex min-w-0 items-start gap-2 text-[13px] text-slate-800">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0 mt-0.5 md:w-3 md:h-3 lg:w-4 lg:h-4" />
              <span className="font-medium break-words text-slate-500 line-clamp-2 min-h-[32px]" title={(() => { try { const _d = parseSqliteUtc(request.created_at || ""); return Number.isNaN(_d.getTime()) ? "" : format(_d, "PPPP p"); } catch { return ""; } })()} suppressHydrationWarning>
                {formatPostedAt(request.created_at)}
              </span>
            </div>
          </div>

          {/* Admin notice — fixed 2-line window when present */}
          {request.admin_notice && (
            <div className="mb-3 rounded-lg bg-indigo-50 border-l-4 border-indigo-400 px-3 py-1.5 h-[44px] overflow-hidden">
              <p className="text-[13px] text-indigo-800 font-semibold break-words line-clamp-2">
                📢 {request.admin_notice}
              </p>
            </div>
          )}

          {/* Reason — fixed 2-line window, space always reserved so cards
              with and without a reason keep identical heights */}
          <ReasonText reason={request.reason} />

          {/* Action buttons — pinned to the card bottom so stretched cards stay tidy.
              Single horizontal row on every screen size so the card height is
              identical on mobile and desktop. */}
          <div className="mt-auto flex items-stretch gap-1.5 pt-2 border-t border-slate-100">
            {/* Primary: Call */}
            <button
              onClick={handleCall}
              className="flex-1 min-w-0 inline-flex min-h-10 items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-linear-to-br from-red-500 to-red-600 text-white text-[11px] font-semibold shadow-sm shadow-red-300/40 hover:from-red-600 hover:to-red-700 hover:shadow-md transition-all active:scale-95"
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate">{t("contact")}</span>
            </button>

            {/* WhatsApp — only if a dedicated WhatsApp number was provided */}
            {showWhatsApp && (
              <button
                onClick={handleWhatsApp}
                className="flex-1 min-w-0 inline-flex min-h-10 items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-600 text-white text-[11px] font-semibold shadow-sm shadow-emerald-300/40 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md transition-all active:scale-95"
              >
                <MessageCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">WhatsApp</span>
              </button>
            )}

            {/* Alternative contact — only if NO WhatsApp number */}
            {showAlternative && (
              <button
                onClick={handleCallAlt}
                className="flex-1 min-w-0 inline-flex min-h-10 items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-sky-600 text-white text-[11px] font-semibold hover:bg-sky-700 transition-colors active:scale-95"
              >
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{locale === "bn" ? "বিকল্প" : "Alt"}</span>
              </button>
            )}

            {/* Inline QR code — opens styled QR modal */}
            {inlineQrUrl && (
              <button
                onClick={() => setShowQrModal(true)}
                className="shrink-0 inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 p-1 hover:border-slate-300 transition-colors active:scale-95"
                title={isBn ? "QR কোড দেখুন" : "View QR Code"}
                aria-label={isBn ? "QR কোড দেখুন" : "View QR Code"}
              >
                <span className="relative w-7 h-7">
                  <img src={inlineQrUrl} alt="QR" className="w-7 h-7" />
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <HeartHandshake className="w-2.5 h-2.5 text-red-600" strokeWidth={2.5} />
                  </span>
                </span>
              </button>
            )}


            {/* Fulfilled (admin/record) — hidden once completed */}
            {!isFulfilled && (
              <button
                onClick={() => setShowRecordModal(true)}
                className="shrink-0 inline-flex min-h-10 items-center justify-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors active:scale-95"
                title={t("mark_donation_complete") || "Mark donation complete"}
              >
                <CheckCircle className="w-3 h-3" />
              </button>
              )}

            </div>

          {/* Secondary actions — distance, directions, track */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {typeof request.distance_km === "number" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold whitespace-nowrap shrink-0">
                <Navigation className="w-2.5 h-2.5" />
                {request.distance_km < 1
                  ? `${Math.round(request.distance_km * 1000)} m`
                  : `${request.distance_km.toFixed(1)} km`}
              </span>
            )}

            {directionsUrl && (
              <a
                href={directionsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-green-200 bg-green-50 text-[11px] font-semibold text-green-700 hover:text-green-800 hover:bg-green-100 hover:border-green-300 transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span className="leading-none">{tMap("get_directions")}</span>
              </a>
            )}

            {trackingUrl && (
              <a
                href={trackingUrl}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-green-200 bg-green-50 text-[11px] font-semibold text-green-700 hover:text-green-800 hover:bg-green-100 hover:border-green-300 transition-colors"
                title="Track this request's live status"
              >
                <QrCode className="w-3 h-3" />
                <span className="leading-none">{locale === "bn" ? "ট্র্যাক" : "Track"}</span>
              </a>
            )}

          </div>

          {/* Footer actions — compact Share & Download */}
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-500">
              <Eye className="w-3 h-3" />
              <span>{viewCount}</span>
            </span>
            <div className="flex items-center gap-1 flex-wrap">
            {/* Copy link only */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors"
              title={t("share")}
            >
              {shareCopied ? (
                <Check className="w-2.5 h-2.5 shrink-0" />
              ) : (
                <Link2 className="w-2.5 h-2.5 shrink-0" />
              )}
              <span className="leading-none">{shareCopied ? t("link_copied") : (isBn ? "লিংক" : "Link")}</span>
            </button>

            {/* Copy formatted text — AI-translated to Bengali */}
            <button
              onClick={handleCopyText}
              disabled={translating}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
              title={isBn ? "টেক্সট কপি করুন" : "Copy text"}
            >
              {translating ? (
                <Loader2 className="w-2.5 h-2.5 shrink-0 animate-spin" />
              ) : textCopied ? (
                <Check className="w-2.5 h-2.5 shrink-0" />
              ) : (
                <Copy className="w-2.5 h-2.5 shrink-0" />
              )}
              <span className="leading-none">
                {translating
                  ? (isBn
                      ? ["একটু", "অপেক্ষা…", "বাংলা"][translateStep]
                      : ["Wait", "moment…", "Translating…"][translateStep])
                  : textCopied
                    ? (isBn ? "কপি" : "Copied")
                    : (isBn ? "টেক্সট" : "Text")}
              </span>
            </button>

            {/* Share menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                title={isBn ? "শেয়ার করুন" : "Share"}
              >
                <Share2 className="w-2.5 h-2.5 shrink-0" />
                <span className="leading-none">{isBn ? "শেয়ার" : "Share"}</span>
              </button>
              {showShareMenu && (
                <div className="absolute right-0 bottom-full mb-1 z-30 bg-white rounded-xl shadow-lg border border-slate-200 p-1 flex flex-col gap-0.5 min-w-[120px]">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3 shrink-0" />
                    WhatsApp
                  </a>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <Facebook className="w-3 h-3 shrink-0" />
                    Facebook
                  </a>
                  <a
                    href={messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3 shrink-0" />
                    Messenger
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title={t("download")}
            >
              {downloading ? (
                <Loader2 className="w-2.5 h-2.5 shrink-0 animate-spin" />
              ) : (
                <Download className="w-2.5 h-2.5 shrink-0" />
              )}
              <span className="leading-none">{t("download")}</span>
            </button>
            </div>
          </div>
        </div>
      </article>

      {/* Hidden 1080×1080 Facebook share template — captured by handleDownloadImage.
          Kept off-screen with absolute positioning (fixed breaks html-to-image clones). */}
      <div
        ref={shareRef}
        aria-hidden
        style={{ position: "absolute", top: 0, left: -9999, pointerEvents: "none" }}
      >
        <RequestShareImage
          patientName={bnImageFields?.patientName ?? request.patient_name}
          bloodGroup={bnImageFields?.bloodGroup ?? request.blood_group}
          unitsNeeded={request.units_needed}
          hospitalName={bnImageFields?.hospitalName ?? request.hospital_name}
          locationText={bnImageFields?.locationText ?? `${request.upazila}, ${request.district}`}
          whenNeededText={bnImageFields?.whenNeededText ?? whenNeededText}
          urgencyLabel={bnImageFields?.urgencyLabel ?? urgencyLabel}
          reason={bnImageFields?.reason || request.reason || undefined}
          primaryPhone={primaryPhone || null}
          altPhone={altPhone}
          whatsappNumber={whatsappNumber}
          trackingCode={trackingId}
          siteOrigin={isClient ? window.location.origin : ""}
          qrDataUrl={qrDataUrl}
          patientHbLevel={request.patient_hb_level ?? null}
          labels={{
            urgentBadge: isBn ? "জরুরি" : t("share_urgent_badge"),
            bagsNeeded: isBn ? "ব্যাগ প্রয়োজন" : t("share_bags_needed"),
            hospital: isBn ? "হাসপাতাল" : t("share_hospital"),
            location: isBn ? "অবস্থান" : t("share_location"),
            neededBy: isBn ? "প্রয়োজনীয় তারিখ" : t("share_needed_by"),
            urgency: isBn ? "জরুরিতা" : t("share_urgency"),
            callNow: isBn ? "এখনই কল করুন" : t("share_call_now"),
            alternative: isBn ? "বিকল্প" : t("share_alternative"),
            whatsapp: isBn ? "হোয়াটসঅ্যাপ" : t("share_whatsapp"),
            scanToView: isBn ? "স্ক্যান করে দেখুন" : t("share_scan_qr"),
          }}
        />
      </div>

      {showRecordModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowRecordModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                {t("quick_record") || "Record Donation"}
              </h3>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
                <strong>{request.patient_name}</strong> needs{" "}
                <strong>{request.blood_group}</strong> at{" "}
                <strong>{request.hospital_name}</strong>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  <Search className="w-4 h-4 inline mr-1" />
                  {t("who_donated") || "Who donated?"}
                </label>
                <input
                  type="text"
                  value={donorSearch}
                  onChange={(e) => setDonorSearch(e.target.value)}
                  placeholder="Search donor by name or phone..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                />
                <div className="mt-2 max-h-32 overflow-y-auto border border-slate-200 rounded-lg">
                  {filteredDonors.length === 0 ? (
                    <div className="p-3 text-center text-sm text-slate-400">
                      No eligible {request.blood_group} donors found
                    </div>
                  ) : (
                    filteredDonors.map((d: any) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDonorId(d.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 ${
                          selectedDonorId === d.id ? "bg-emerald-100 border-l-2 border-emerald-500" : ""
                        }`}
                      >
                        <span>{d.full_name_en || d.full_name_bn}</span>
                        <span className="ml-auto text-xs text-slate-400">{d.phone}</span>
                      </button>
                    ))
                  )}
                </div>
                <QuickAddDonor
                  defaultBloodGroup={request.blood_group}
                  locale={locale}
                  onCreated={(donor) => {
                    setDonors((prev) => [...prev, donor]);
                    setSelectedDonorId(donor.id);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="whole_blood">Whole Blood</option>
                    <option value="platelets">Platelets</option>
                    <option value="plasma">Plasma</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Units</label>
                  <input
                    type="number"
                    value={recordUnits}
                    onChange={(e) => setRecordUnits(e.target.value)}
                    min={1}
                    max={5}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>

              {/* Referrer — who helped find the donor? */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t("who_referred") || "Who helped find the donor? (optional)"}
                </label>
                <select
                  value={refMode}
                  onChange={(e) => {
                    setRefMode(e.target.value as "none" | "user" | "text");
                    setSelectedReferrerId(null);
                    setRefSearch("");
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="none">{t("referrer_none") || "No one / Skip"}</option>
                  <option value="user">{t("referrer_user") || "A registered user"}</option>
                  <option value="text">{t("referrer_other") || "Someone else (name + phone)"}</option>
                </select>

                {refMode === "user" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={refSearch}
                      onChange={(e) => {
                        setRefSearch(e.target.value);
                        setSelectedReferrerId(null);
                      }}
                      placeholder={t("referrer_search_ph") || "Search user by name or phone..."}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    {refCandidates.length > 0 && !selectedReferrerId && (
                      <div className="mt-1.5 max-h-28 overflow-y-auto border border-slate-200 rounded-lg">
                        {refCandidates.map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setSelectedReferrerId(u.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
                          >
                            <span>{u.full_name_en || u.full_name_bn}</span>
                            <span className="ml-auto text-xs text-slate-400">{u.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedReferrerId && (
                      <p className="mt-1.5 text-xs text-indigo-700 font-semibold">
                        ✓ {refCandidates.find((u: any) => u.id === selectedReferrerId)?.full_name_en ||
                           refCandidates.find((u: any) => u.id === selectedReferrerId)?.full_name_bn ||
                           refSearch}
                      </p>
                    )}
                  </div>
                )}

                {refMode === "text" && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={refName}
                      onChange={(e) => setRefName(e.target.value)}
                      placeholder={t("referrer_name_ph") || "Referrer name"}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <input
                      type="tel"
                      value={refPhone}
                      onChange={(e) => setRefPhone(e.target.value)}
                      placeholder={t("referrer_phone_ph") || "Phone (optional)"}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleRecordDonation}
                disabled={!selectedDonorId || recording}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold text-sm hover:from-emerald-700 hover:to-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {t("confirm_record") || "✓ Confirm & Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code modal — track or share */}
      {showQrModal && (absoluteTrackingUrl || cardShareUrl) && (
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
                <QrCode className="w-5 h-5 text-slate-600" />
                {isBn ? "QR কোড" : "QR Code"}
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Toggle between Track and Share */}
            <div className="flex w-full rounded-lg bg-slate-100 p-1 mb-4">
              <button
                onClick={() => { setQrMode("track"); setQrModalDataUrl(null); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  qrMode === "track"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {isBn ? "ট্র্যাক" : "Track"}
              </button>
              <button
                onClick={() => { setQrMode("share"); setQrModalDataUrl(null); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  qrMode === "share"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {isBn ? "শেয়ার" : "Share"}
              </button>
            </div>

            <p className="text-sm text-slate-500 text-center mb-4">
              {qrMode === "track"
                ? (isBn ? "স্ক্যান করে ট্র্যাক করুন" : "Scan to track this request")
                : (isBn ? "স্ক্যান করে সরাসরি দেখুন" : "Scan to view this request directly")}
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              {qrModalDataUrl ? (
                <div ref={qrFrameRef} className="relative w-48 h-48 mx-auto">
                  <img src={qrModalDataUrl} alt="QR Code" className="w-48 h-48" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        {qrMode === "track"
                          ? <Radar className="w-5 h-5 text-red-600" strokeWidth={2.5} />
                          : <HeartHandshake className="w-7 h-7 text-red-600" strokeWidth={2.5} />}
                      </div>
                    </div>
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono break-all text-center max-w-full">
              {qrMode === "track" ? absoluteTrackingUrl : cardShareUrl}
            </p>
            <div className="mt-3 flex gap-2 w-full">
              <button
                onClick={async () => {
                  try {
                    const url = qrMode === "track" ? absoluteTrackingUrl : cardShareUrl;
                    await navigator.clipboard.writeText(url);
                    setQrLinkCopied(true);
                    setTimeout(() => setQrLinkCopied(false), 1600);
                  } catch (e) {
                    console.error("Copy failed:", e);
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
                  const fname = qrMode === "track"
                    ? `track-${trackingId || request.id || "card"}.png`
                    : `share-${trackingId || request.id || "card"}.png`;
                  if (qrFrameRef.current) {
                    try {
                      const dataUrl = await toPng(qrFrameRef.current, {
                        cacheBust: true,
                        pixelRatio: 3,
                        backgroundColor: undefined,
                        skipFonts: true,
                      });
                      downloadDataUrl(dataUrl, fname);
                    } catch (err) {
                      console.error("QR download failed", err);
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
    </>
  );
}
