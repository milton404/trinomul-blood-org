"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  IdCard,
  Loader2,
  AlertCircle,
  Eye,
  X,
} from "lucide-react";
import {
  serverGetSignedNidUrl,
  serverSetPhoneVerified,
  serverVerifyDonor,
} from "@/lib/db-actions";

interface DonorVerificationPanelProps {
  donorId: number;
  nidNumber: string | null;
  nidFrontPublicId: string | null;
  nidBackPublicId: string | null;
  phone: string | null;
  phoneVerified: number;
  verificationStatus: string;
  isVerified: number;
  verificationNote: string | null;
  verifiedAt: string | null;
  nidUploadedAt: string | null;
  /** Called after a verification action so the parent can refresh profile data. */
  onStateChange?: () => void;
}

export default function DonorVerificationPanel({
  donorId,
  nidNumber,
  nidFrontPublicId,
  nidBackPublicId,
  phone,
  phoneVerified,
  verificationStatus,
  isVerified,
  verificationNote,
  verifiedAt,
  nidUploadedAt,
  onStateChange,
}: DonorVerificationPanelProps) {
  const locale = useLocale();
  const isBn = locale === "bn";

  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  // Fetch signed URLs for NID images (admin-only, short-lived).
  const loadSignedUrls = useCallback(async () => {
    if (!nidFrontPublicId && !nidBackPublicId) return;
    setLoadingImages(true);
    try {
      const [front, back] = await Promise.all([
        nidFrontPublicId ? serverGetSignedNidUrl(nidFrontPublicId) : Promise.resolve(null),
        nidBackPublicId ? serverGetSignedNidUrl(nidBackPublicId) : Promise.resolve(null),
      ]);
      setFrontUrl(front);
      setBackUrl(back);
    } catch {
      /* signed URL generation failed — images won't preview */
    } finally {
      setLoadingImages(false);
    }
  }, [nidFrontPublicId, nidBackPublicId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSignedUrls();
  }, [loadSignedUrls]);

  const handlePhoneToggle = async () => {
    setPhoneLoading(true);
    try {
      const res = await serverSetPhoneVerified(donorId, !phoneVerified);
      toast.success(
        res.phoneVerified
          ? isBn ? "ফোন যাচাই হয়েছে" : "Phone verified"
          : isBn ? "ফোন যাচাই সরানো হয়েছে" : "Phone verification removed",
      );
      onStateChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isBn ? "ব্যর্থ" : "Failed");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await serverVerifyDonor(donorId, { status: "verified" });
      toast.success(isBn ? "NID যাচাইকৃত" : "NID verified");
      onStateChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isBn ? "ব্যর্থ" : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await serverVerifyDonor(donorId, { status: "rejected", note: rejectNote.trim() || undefined });
      toast.success(isBn ? "NID প্রত্যাখ্যাত" : "NID rejected");
      setRejectMode(false);
      setRejectNote("");
      onStateChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isBn ? "ব্যর্থ" : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

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

  const hasNid = Boolean(nidNumber || nidFrontPublicId || nidBackPublicId);
  const status = verificationStatus || "unverified";

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-red-500" />
        {isBn ? "পরিচয় যাচাই" : "Identity Verification"}
        <StatusBadge status={status} isVerified={Boolean(isVerified)} isBn={isBn} />
      </h2>

      {/* ── Master verified flag ────────────────────────────────────────── */}
      {isVerified ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">
            {isBn ? "সম্পূর্ণ যাচাইকৃত দাতা (ফোন + NID)" : "Fully verified donor (phone + NID)"}
          </span>
          <span className="text-xs text-emerald-600 ml-auto">
            {fmtDate(verifiedAt)}
          </span>
        </div>
      ) : null}

      {/* ── NID details ─────────────────────────────────────────────────── */}
      {!hasNid ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">
            {isBn ? "দাতা এখনো NID জমা দেয়নি" : "Donor has not submitted NID yet"}
          </span>
        </div>
      ) : (
        <>
          {/* NID number + upload date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <IdCard className="w-3 h-3" />
                {isBn ? "NID নম্বর" : "NID Number"}
              </span>
              <p className="font-semibold text-slate-900 mt-1 text-sm">{nidNumber || "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isBn ? "জমা তারিখ" : "Submitted"}
              </span>
              <p className="font-semibold text-slate-900 mt-1 text-sm">{fmtDate(nidUploadedAt)}</p>
            </div>
          </div>

          {/* NID image previews (signed URLs) */}
          <div className="grid grid-cols-2 gap-3">
            <NidImagePreview
              label={isBn ? "সামনের দিক" : "Front"}
              url={frontUrl}
              loading={loadingImages}
              isBn={isBn}
            />
            <NidImagePreview
              label={isBn ? "পেছনের দিক" : "Back"}
              url={backUrl}
              loading={loadingImages}
              isBn={isBn}
            />
          </div>

          {verificationNote && status === "rejected" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <span className="text-xs text-red-600 font-semibold">
                {isBn ? "প্রত্যাখ্যানের কারণ:" : "Rejection reason:"}
              </span>
              <p className="text-sm text-red-700 mt-1">{verificationNote}</p>
            </div>
          )}
        </>
      )}

      {/* ── Phone verification ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-slate-400" />
          <div>
            <span className="text-sm font-medium text-slate-700">{phone || "—"}</span>
            <span className="text-xs text-slate-400 ml-2">
              {phoneVerified
                ? isBn ? "যাচাইকৃত" : "Verified"
                : isBn ? "যাচাই হয়নি" : "Not verified"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              {isBn ? "কল" : "Call"}
            </a>
          )}
          <button
            type="button"
            onClick={handlePhoneToggle}
            disabled={phoneLoading}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
              phoneVerified
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {phoneLoading
              ? "…"
              : phoneVerified
                ? isBn ? "সরান" : "Unverify"
                : isBn ? "যাচাই করুন" : "Verify"}
          </button>
        </div>
      </div>

      {/* ── NID approve / reject actions ────────────────────────────────── */}
      {hasNid && status !== "verified" && (
        <div className="space-y-2">
          {!rejectMode ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isBn ? "NID অনুমোদন" : "Approve NID"}
              </button>
              <button
                type="button"
                onClick={() => setRejectMode(true)}
                disabled={actionLoading}
                className="flex-1 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                {isBn ? "প্রত্যাখ্যাত" : "Reject"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={isBn ? "প্রত্যাখ্যানের কারণ (ঐচ্ছিক)" : "Rejection reason (optional)"}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  {isBn ? "নিশ্চিত প্রত্যাখ্যাত" : "Confirm Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectMode(false); setRejectNote(""); }}
                  disabled={actionLoading}
                  className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Already verified note ───────────────────────────────────────── */}
      {status === "verified" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">
            {isBn ? `NID যাচাইকৃত — ${fmtDate(verifiedAt)}` : `NID verified — ${fmtDate(verifiedAt)}`}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({
  status,
  isVerified,
  isBn,
}: {
  status: string;
  isVerified: boolean;
  isBn: boolean;
}) {
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-200">
        <ShieldCheck className="w-2.5 h-2.5" />
        {isBn ? "যাচাইকৃত" : "Verified"}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-200">
        <Clock className="w-2.5 h-2.5" />
        {isBn ? "অপেক্ষমাণ" : "Pending"}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
        <XCircle className="w-2.5 h-2.5" />
        {isBn ? "প্রত্যাখ্যাত" : "Rejected"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
      <AlertCircle className="w-2.5 h-2.5" />
      {isBn ? "যাচাই হয়নি" : "Unverified"}
    </span>
  );
}

function NidImagePreview({
  label,
  url,
  loading,
  isBn,
}: {
  label: string;
  url: string | null;
  loading: boolean;
  isBn: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-slate-500 mb-1 block">{label}</span>
      <div className="relative w-full aspect-[1.6/1] rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : url ? (
          // NID images are authenticated Cloudinary resources served via
          // short-lived signed URLs. next/image doesn't handle these well
          // (remote signed URLs with expiry), so use a plain img.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
            <Eye className="w-5 h-5" />
            <span className="text-[10px]">
              {isBn ? "প্রিভিউ অনুপলব্ধ" : "Preview unavailable"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}