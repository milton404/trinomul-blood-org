"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  ShieldCheck,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  IdCard,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  serverGetMyVerificationStatus,
  serverSubmitNidForVerification,
  serverSetAnonymousMode,
} from "@/lib/db-actions";
import type { VerificationStatus } from "@/types/donor-verification";

type Side = "front" | "back";

export default function NidVerificationSection() {
  const locale = useLocale();
  const isBn = locale === "bn";

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus>("unverified");
  const [isVerified, setIsVerified] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [nidUploadedAt, setNidUploadedAt] = useState<string | null>(null);
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  // Form state
  const [nidNumber, setNidNumber] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploadingSide, setUploadingSide] = useState<Side | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [anonToggling, setAnonToggling] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Load current verification status on mount.
  const loadStatus = useCallback(async () => {
    try {
      const result = await serverGetMyVerificationStatus();
      if (!result) return;
      setStatus(result.verificationStatus);
      setIsVerified(result.isVerified);
      setIsAnonymous(result.isAnonymous);
      setNidUploadedAt(result.nidUploadedAt);
      setVerificationNote(result.verificationNote);
      setPhoneVerified(result.phoneVerified);
      setVerifiedAt(result.verifiedAt);
      if (result.nidNumber) setNidNumber(result.nidNumber);
    } catch {
      /* silent — status will just show unverified */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Data-fetching effect: loads verification status from the server.
    // setState calls happen after await (async), not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, [loadStatus]);

  const handleFileSelect = (side: Side) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type + size (5MB for NID — smaller than avatar's 10MB).
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(isBn ? "শুধুমাত্র JPG, PNG, বা WebP" : "Only JPG, PNG, or WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isBn ? "ছবি ৫MB এর কম হতে হবে" : "Image must be under 5MB");
      return;
    }

    // Local preview via FileReader (NID is authenticated on Cloudinary,
    // so we can't fetch it back via URL — preview from the local File only).
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      if (side === "front") {
        setFrontFile(file);
        setFrontPreview(preview);
      } else {
        setBackFile(file);
        setBackPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  const canSubmit =
    nidNumber.trim().length > 0 &&
    (frontFile !== null || status !== "unverified") &&
    (backFile !== null || status !== "unverified") &&
    !submitting &&
    !uploadingSide;

  const handleSubmit = async () => {
    const trimmed = nidNumber.trim();
    if (!/^\d{10}$/.test(trimmed) && !/^\d{17}$/.test(trimmed)) {
      toast.error(isBn ? "NID নম্বর ১০ বা ১৭ ডিজিট হতে হবে" : "NID must be 10 or 17 digits");
      return;
    }

    // If re-uploading, require both new files (to replace both sides).
    // First submission requires both files.
    if (!frontFile || !backFile) {
      toast.error(isBn ? "উভয় দিকের ছবি আপলোড করুন" : "Please upload both sides");
      return;
    }

    setSubmitting(true);
    try {
      // Upload front → Cloudinary (authenticated type, store publicId).
      setUploadingSide("front");
      const frontResult = await uploadImageToCloudinary(frontFile, undefined, "nid");

      // Upload back → Cloudinary.
      setUploadingSide("back");
      const backResult = await uploadImageToCloudinary(backFile, undefined, "nid");

      setUploadingSide(null);

      // Submit to server — stores publicIds + sets status → pending.
      const res = await serverSubmitNidForVerification({
        nidNumber: trimmed,
        nidFrontUrl: frontResult.publicId,
        nidBackUrl: backResult.publicId,
      });

      if (!res.success) {
        toast.error(res.message || (isBn ? "জমা দিতে সমস্যা" : "Submission failed"));
        return;
      }

      toast.success(isBn ? "NID জমা হয়েছে, যাচাইয়ের জন্য অপেক্ষমাণ" : "NID submitted for review");
      // Reset form + refresh status.
      setFrontFile(null);
      setBackFile(null);
      setFrontPreview(null);
      setBackPreview(null);
      await loadStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : isBn ? "আপলোড ব্যর্থ" : "Upload failed",
      );
    } finally {
      setUploadingSide(null);
      setSubmitting(false);
    }
  };

  const handleAnonymousToggle = async () => {
    setAnonToggling(true);
    try {
      const res = await serverSetAnonymousMode(!isAnonymous);
      setIsAnonymous(res.isAnonymous);
      toast.success(
        res.isAnonymous
          ? isBn ? "অজ্ঞাত মোড চালু" : "Anonymous mode on"
          : isBn ? "অজ্ঞাত মোড বন্ধ" : "Anonymous mode off",
      );
    } catch {
      toast.error(isBn ? "পরিবর্তন ব্যর্থ" : "Toggle failed");
    } finally {
      setAnonToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Status banner ─────────────────────────────────────────────── */}
      <StatusBanner
        status={status}
        isVerified={isVerified}
        phoneVerified={phoneVerified}
        nidUploadedAt={nidUploadedAt}
        verifiedAt={verifiedAt}
        verificationNote={verificationNote}
        isBn={isBn}
      />

      {/* ── NID upload form (shown when unverified, rejected, or re-upload) */}
      {(status === "unverified" || status === "rejected") && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <IdCard className="w-4 h-4" />
            {isBn ? "NID আপলোড করুন" : "Upload National ID"}
          </h3>

          {/* NID number */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {isBn ? "NID নম্বর" : "NID Number"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={nidNumber}
              onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ""))}
              placeholder={isBn ? "১০ বা ১৭ ডিজিট" : "10 or 17 digits"}
              maxLength={17}
              className="w-full max-w-xs px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* File dropzones */}
          <div className="grid grid-cols-2 gap-3">
            <FileDropzone
              label={isBn ? "সামনের দিক" : "Front side"}
              preview={frontPreview}
              uploading={uploadingSide === "front"}
              inputRef={frontInputRef}
              onSelect={handleFileSelect("front")}
              isBn={isBn}
            />
            <FileDropzone
              label={isBn ? "পেছনের দিক" : "Back side"}
              preview={backPreview}
              uploading={uploadingSide === "back"}
              inputRef={backInputRef}
              onSelect={handleFileSelect("back")}
              isBn={isBn}
            />
          </div>

          <p className="text-xs text-slate-400">
            {isBn
              ? "আপনার NID ছবি নিরাপদে সংরক্ষিত হয়। শুধুমাত্র অ্যাডমিন যাচাইয়ের জন্য দেখতে পারবেন।"
              : "Your NID images are stored securely. Only admins can view them for verification."}
          </p>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isBn ? "যাচাইয়ের জন্য জমা দিন" : "Submit for verification"}
          </button>
        </div>
      )}

      {/* ── Re-upload button (when pending) */}
      {status === "pending" && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <button
            type="button"
            onClick={() => {
              setStatus("unverified");
              setFrontPreview(null);
              setBackPreview(null);
            }}
            className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isBn ? "পুনরায় আপলোড করুন" : "Re-upload"}
          </button>
        </div>
      )}

      {/* ── Anonymous mode toggle ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              {isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isBn ? "অজ্ঞাত মোড" : "Anonymous Mode"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isBn
                ? "চালু হলে শুধুমাত্র রক্তের গ্রুপ ও এলাকা দেখাবে, নাম লুকাবে।"
                : "When on, only your blood group + area are shown; your name is hidden."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAnonymousToggle}
            disabled={anonToggling}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
              isAnonymous ? "bg-emerald-600" : "bg-slate-300"
            } disabled:opacity-50`}
            aria-label={isBn ? "অজ্ঞাত মোড টগল" : "Toggle anonymous mode"}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                isAnonymous ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBanner({
  status,
  isVerified,
  phoneVerified,
  nidUploadedAt,
  verifiedAt,
  verificationNote,
  isBn,
}: {
  status: VerificationStatus;
  isVerified: boolean;
  phoneVerified: boolean;
  nidUploadedAt: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
  isBn: boolean;
}) {
  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z").toLocaleDateString(
        isBn ? "bn-BD" : "en-US",
        { day: "numeric", month: "short", year: "numeric" },
      );
    } catch {
      return iso;
    }
  };

  if (status === "verified" || isVerified) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-800">
            {isBn ? "যাচাইকৃত দাতা" : "Verified Donor"}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {isBn ? `যাচাই তারিখ: ${fmtDate(verifiedAt)}` : `Verified on: ${fmtDate(verifiedAt)}`}
          </p>
        </div>
        <ShieldCheck className="w-5 h-5 text-emerald-600" />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            {isBn ? "যাচাইয়ের অধীন" : "Under Review"}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            {isBn
              ? `জমা দেওয়া হয়েছে: ${fmtDate(nidUploadedAt)}`
              : `Submitted on: ${fmtDate(nidUploadedAt)}`}
          </p>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">
            {isBn ? "যাচাই প্রত্যাখ্যাত" : "Verification Rejected"}
          </p>
          {verificationNote && (
            <p className="text-xs text-red-600 mt-0.5">{verificationNote}</p>
          )}
          <p className="text-xs text-red-500 mt-1">
            {isBn ? "আবার আপলোড করে চেষ্টা করুন।" : "Please re-upload and try again."}
          </p>
        </div>
      </div>
    );
  }

  // unverified
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-700">
          {isBn ? "যাচাই হয়নি" : "Not Verified"}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {isBn
            ? "NID আপলোড করে যাচাই পান। যাচাই ছাড়াও রক্তদান সম্ভব।"
            : "Upload your NID to get verified. You can donate without verification too."}
        </p>
        {!phoneVerified && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {isBn ? "ফোন যাচাই বাকি" : "Phone not verified yet"}
          </p>
        )}
      </div>
    </div>
  );
}

function FileDropzone({
  label,
  preview,
  uploading,
  inputRef,
  onSelect,
  isBn,
}: {
  label: string;
  preview: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isBn: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-full aspect-[1.6/1] rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-400 transition-colors overflow-hidden bg-slate-50 disabled:opacity-50"
      >
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          </div>
        ) : preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
            <Upload className="w-5 h-5" />
            <span className="text-[10px]">{isBn ? "ট্যাপ করুন" : "Tap to upload"}</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onSelect}
        className="hidden"
        aria-label={label}
      />
    </div>
  );
}