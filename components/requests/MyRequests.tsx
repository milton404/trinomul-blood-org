"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatWhenNeededDynamic } from "@/lib/utils/when-needed";
import { ListSkeleton } from "@/components/ui/Skeleton";
import {
  Droplet,
  Trash2,
  Loader2,
  QrCode,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  CheckCircle,
  Share2,
  X,
  Save,
  Zap,
  RotateCcw,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Link } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  serverGetMyRequests,
  serverArchiveOwnRequest,
  serverGetRequestProgress,
  serverGetRequestStatusLogs,
  serverUpdateOwnRequest,
  serverMarkOwnRequestFulfilled,
  serverBoostOwnRequest,
} from "@/lib/db-actions";

type PipelineStage = "submitted" | "searching" | "donor_found" | "fulfilled";

function deriveStage(r: any): PipelineStage {
  if (r.status === "fulfilled" || r.current_status === "fulfilled")
    return "fulfilled";
  if (r.donor_id || r.current_status === "donor_found" || r.current_status === "matched")
    return "donor_found";
  if (r.current_status === "submitted" && !r.status) return "submitted";
  return r.current_status === "submitted" ? "submitted" : "searching";
}

/**
 * "My Requests" section on the profile page — only rendered for the
 * requester role (patients + donors) from their profile. A registered
 * requester can expand each request for details + fulfillment progress,
 * share it via WhatsApp, edit active requests, mark them fulfilled, or
 * delete them (hidden instantly; kept in admin history).
 */
export default function MyRequests() {
  const t = useTranslations("common");
  const locale = useLocale();
  const isBn = locale === "bn";
  const { user, role, isLoading: authLoading } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [logs, setLogs] = useState<Record<number, any[]>>({});
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);
  const [boostingId, setBoostingId] = useState<number | null>(null);
  const router = useRouter();

  const userId = user?.id ? Number(user.id) : null;
  // Patients and donors can manage blood requests from their profile.
  const isRequester = role === "patient" || role === "donor";

  const load = async () => {
    if (!userId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await serverGetMyRequests(userId);
      setRequests(rows || []);
    } catch (e) {
      console.error("Failed to load my requests:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isRequester) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading, isRequester]);

  const toggleExpand = async (requestId: number) => {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);
    if (progress[requestId] === undefined) {
      try {
        const collected = await serverGetRequestProgress(requestId);
        setProgress((p) => ({ ...p, [requestId]: collected }));
      } catch {}
    }
    if (!logs[requestId]) {
      try {
        const rows = await serverGetRequestStatusLogs(requestId);
        setLogs((l) => ({ ...l, [requestId]: (rows as any[]) || [] }));
      } catch {}
    }
  };

  const handleDelete = async (requestId: number) => {
    if (!userId) return;
    const msg = isBn
      ? "আপনি কি এই রিকোয়েস্টটি মুছে ফেলতে চান? এটি আর দেখা যাবে না।"
      : "Delete this request? It will no longer be visible.";
    if (!confirm(msg)) return;
    setDeletingId(requestId);
    try {
      await serverArchiveOwnRequest(requestId, userId);
      await load();
    } catch (e: any) {
      alert(e.message || "Failed to delete");
    }
    setDeletingId(null);
  };

  const handleMarkFulfilled = async (requestId: number) => {
    if (!userId) return;
    const msg = isBn
      ? "এই রিকোয়েস্টটি সম্পন্ন হিসেবে চিহ্নিত করবেন?"
      : "Mark this request as fulfilled?";
    if (!confirm(msg)) return;
    setFulfillingId(requestId);
    try {
      await serverMarkOwnRequestFulfilled(requestId, userId);
      toast.success(isBn ? "রিকোয়েস্ট সম্পন্ন হয়েছে ✓" : "Request marked as fulfilled ✓");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
    setFulfillingId(null);
  };

  const openEdit = (r: any) => {
    setEditingRequest(r);
    setEditForm({
      patient_name: r.patient_name || "",
      patient_age: r.patient_age ?? "",
      units_needed: r.units_needed ?? 1,
      urgency_level: r.urgency_level || "normal",
      hospital_name: r.hospital_name || "",
      hospital_address: r.hospital_address || "",
      contact_number: r.contact_number || "",
      alternative_number: r.alternative_number || "",
      reason: r.reason || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!userId || !editingRequest) return;
    setSavingEdit(true);
    try {
      await serverUpdateOwnRequest(editingRequest.id, userId, {
        ...editForm,
        patient_age:
          editForm.patient_age === "" ? null : Number(editForm.patient_age),
        units_needed: Number(editForm.units_needed) || 1,
      });
      toast.success(isBn ? "রিকোয়েস্ট আপডেট হয়েছে" : "Request updated");
      setEditingRequest(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    }
    setSavingEdit(false);
  };

  const handleBoost = async (requestId: number) => {
    if (!userId) return;
    setBoostingId(requestId);
    try {
      const result = await serverBoostOwnRequest(requestId, userId);
      toast.success(
        result.matchedCount > 0
          ? isBn
            ? `বুস্ট হয়েছে! ${result.matchedCount} জন ডোনারকে আবার জানানো হয়েছে 🚀`
            : `Boosted! ${result.matchedCount} donors re-notified 🚀`
          : isBn
            ? "বুস্ট হয়েছে! রিকোয়েস্টটি আবার উপরে দেখা যাবে 🚀"
            : "Boosted! Your request is resurfaced 🚀",
      );
      await load();
    } catch (e: any) {
      toast.error(e.message || "Boost failed");
    }
    setBoostingId(null);
  };

  const boostedRecently = (r: any): boolean => {
    if (!r.boosted_at) return false;
    const boostedAt = new Date(r.boosted_at.replace(" ", "T") + "Z").getTime();
    return Date.now() - boostedAt < 24 * 3600 * 1000;
  };

  /** "Request Again" — stash the request as a template and open the form. */
  const handleRequestAgain = (r: any) => {
    try {
      sessionStorage.setItem(
        "request_template",
        JSON.stringify({
          patientName: r.patient_name,
          patientAge: r.patient_age,
          bloodGroup: r.blood_group,
          unitsNeeded: r.units_needed,
          hospitalName: r.hospital_name,
          hospitalAddress: r.hospital_address,
          reason: r.reason,
        }),
      );
    } catch {}
    router.push("/request");
  };

  const handleWhatsAppShare = (r: any) => {
    const trackUrl = r.tracking_code
      ? `${window.location.origin}/${locale}/track/${r.tracking_code}`
      : `${window.location.origin}/${locale}/requests`;
    const msg = isBn
      ? `🩸 রক্তের প্রয়োজন: ${r.blood_group}\nরোগী: ${r.patient_name}\nহাসপাতাল: ${r.hospital_name || "-"}\nএলাকা: ${[r.upazila, r.district].filter(Boolean).join(", ")}\nইউনিট: ${r.units_needed || 1}\nযোগাযোগ: ${r.contact_number || "-"}\n\nবিস্তারিত ও ট্র্যাকিং: ${trackUrl}`
      : `🩸 Blood Needed: ${r.blood_group}\nPatient: ${r.patient_name}\nHospital: ${r.hospital_name || "-"}\nArea: ${[r.upazila, r.district].filter(Boolean).join(", ")}\nUnits: ${r.units_needed || 1}\nContact: ${r.contact_number || "-"}\n\nDetails & tracking: ${trackUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Donors/hospitals never see this section (and never trigger the query).
  if (authLoading || !userId || !isRequester) return null;

  const statusLabel = (r: any): { text: string; cls: string } => {
    if (r.archived_at && r.archive_reason === "deleted_by_user")
      return { text: isBn ? "মুছে ফেলা হয়েছে" : "Deleted", cls: "bg-slate-100 text-slate-500" };
    if (r.archived_at && r.archive_reason === "cancelled")
      return { text: isBn ? "বাতিল" : "Cancelled", cls: "bg-slate-100 text-slate-500" };
    if (r.archived_at && r.archive_reason === "expired")
      return { text: isBn ? "মেয়াদোত্তীর্ণ" : "Expired", cls: "bg-slate-100 text-slate-500" };
    if (r.status === "fulfilled")
      return { text: isBn ? "সম্পন্ন ✓" : "Completed ✓", cls: "bg-emerald-100 text-emerald-700" };
    if (r.is_last_chance)
      return { text: isBn ? "শেষ সুযোগ" : "Last Chance", cls: "bg-amber-100 text-amber-700" };
    return { text: isBn ? "সক্রিয়" : "Active", cls: "bg-emerald-50 text-emerald-600" };
  };

  const stageMeta: { key: PipelineStage; en: string; bn: string }[] = [
    { key: "submitted", en: "Submitted", bn: "জমা দেওয়া" },
    { key: "searching", en: "Searching", bn: "ডোনার খোঁজা হচ্ছে" },
    { key: "donor_found", en: "Donor Found", bn: "ডোনার পাওয়া গেছে" },
    { key: "fulfilled", en: "Fulfilled", bn: "সম্পন্ন" },
  ];

  const stageTime = (r: any, stage: PipelineStage): string | null => {
    const requestLogs = logs[r.id] || [];
    const match = requestLogs.find((l: any) => {
      if (stage === "submitted") return l.status === "submitted";
      if (stage === "searching") return l.status === "active" || l.status === "searching";
      if (stage === "donor_found")
        return l.status === "donor_found" || l.status === "matched";
      return l.status === "fulfilled";
    });
    const ts =
      match?.created_at ||
      (stage === "submitted" ? r.created_at : null) ||
      (stage === "fulfilled" ? r.donated_at : null);
    if (!ts) return null;
    return new Date(ts.replace?.(" ", "T") || ts).toLocaleDateString(
      isBn ? "bn-BD" : "en-US",
      { day: "numeric", month: "short" },
    );
  };

  const renderPipeline = (r: any) => {
    const current = deriveStage(r);
    const currentIdx = stageMeta.findIndex((s) => s.key === current);
    const isArchived = !!r.archived_at && r.status !== "fulfilled";
    if (isArchived) return null;
    return (
      <div className="flex items-center gap-0 mt-3">
        {stageMeta.map((s, i) => {
          const done = i < currentIdx || current === "fulfilled";
          const active = i === currentIdx && current !== "fulfilled";
          const time = done || active ? stageTime(r, s.key) : null;
          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center text-center min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                    done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : active
                        ? "bg-white border-red-500 text-red-600"
                        : "bg-white border-slate-200 text-slate-300"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <p
                  className={`text-[9px] mt-1 font-semibold leading-tight ${
                    done
                      ? "text-emerald-600"
                      : active
                        ? "text-red-600"
                        : "text-slate-400"
                  }`}
                >
                  {isBn ? s.bn : s.en}
                </p>
                {time && <p className="text-[8px] text-slate-400">{time}</p>}
              </div>
              {i < stageMeta.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 -mt-4 rounded ${
                    i < currentIdx ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm";

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Droplet className="w-5 h-5 text-red-600" />
          {t("my_requests") || "My Blood Requests"}
        </h2>
        <Link
          href="/request"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {isBn ? "নতুন রিকোয়েস্ট" : "New Request"}
        </Link>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-500">
            {t("no_my_requests") || "You haven't posted any blood requests yet."}
          </p>
          <Link
            href="/request"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 transition-all"
          >
            <Plus className="w-4 h-4" />
            {isBn ? "রক্তের রিকোয়েস্ট করুন" : "Request Blood Now"}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const s = statusLabel(r);
            const hidden = !!r.archived_at;
            const expanded = expandedId === r.id;
            const needed = r.units_needed || 1;
            const collected = progress[r.id] ?? 0;
            const pct = Math.min(100, Math.round((collected / needed) * 100));
            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border p-4 ${
                  hidden ? "border-slate-200 opacity-70" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                    <span className="text-sm font-black text-red-600">{r.blood_group}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm truncate">{r.patient_name}</p>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${s.cls}`}>
                        {s.text}
                      </span>
                      {r.urgency_level && r.urgency_level !== "normal" && !hidden && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            r.urgency_level === "critical"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {r.urgency_level === "critical"
                            ? isBn ? "জরুরি" : "Critical"
                            : isBn ? "আর্জেন্ট" : "Urgent"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                      <Clock className="w-3 h-3" />
                      {new Date((r.created_at || "").replace(" ", "T") + "Z").toLocaleDateString(isBn ? "bn-BD" : "en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {r.hospital_name && <span>· {r.hospital_name}</span>}
                      {r.tracking_code && (
                        <a
                          href={`/${locale}/track/${r.tracking_code}`}
                          className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline font-semibold"
                        >
                          <QrCode className="w-3 h-3" />
                          {r.tracking_code}
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!hidden && (
                      <>
                        <button
                          onClick={() => handleWhatsAppShare(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-green-200 text-green-600 text-xs font-semibold hover:bg-green-50 transition-colors active:scale-95"
                          title={isBn ? "WhatsApp-এ শেয়ার করুন" : "Share on WhatsApp"}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {r.status === "active" && (
                          <>
                            <button
                              onClick={() => handleBoost(r.id)}
                              disabled={boostingId === r.id || boostedRecently(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-violet-200 text-violet-600 text-xs font-semibold hover:bg-violet-50 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                              title={
                                boostedRecently(r)
                                  ? isBn
                                    ? "২৪ ঘণ্টায় একবার বুস্ট করা যায়"
                                    : "Can boost once per 24h"
                                  : isBn
                                    ? "বুস্ট করুন — আরও ডোনারদের কাছে পৌঁছান"
                                    : "Boost — notify more donors"
                              }
                            >
                              {boostingId === r.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Zap className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => openEdit(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors active:scale-95"
                              title={isBn ? "এডিট করুন" : "Edit request"}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-colors active:scale-95 disabled:opacity-50"
                          title={t("delete_request") || "Delete request"}
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleExpand(r.id)}
                      className="inline-flex items-center px-2 py-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors"
                      title={isBn ? "বিস্তারিত" : "Details"}
                    >
                      {expanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {renderPipeline(r)}

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                    {/* Fulfillment progress */}
                    {!hidden && (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-600">
                            {isBn ? "সংগৃহীত ইউনিট" : "Units collected"}
                          </span>
                          <span className="font-bold text-slate-800">
                            {collected} / {needed}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100 ? "bg-emerald-500" : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {r.patient_age != null && (
                        <div>
                          <span className="text-slate-400">{isBn ? "বয়স" : "Age"}:</span>{" "}
                          <span className="font-semibold text-slate-700">{r.patient_age}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400">{isBn ? "ইউনিট" : "Units"}:</span>{" "}
                        <span className="font-semibold text-slate-700">{needed}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">{isBn ? "হাসপাতাল" : "Hospital"}:</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {r.hospital_name || "-"}
                          {r.hospital_address ? ` — ${r.hospital_address}` : ""}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400">{isBn ? "এলাকা" : "Area"}:</span>{" "}
                        <span className="font-semibold text-slate-700">
                          {[r.upazila, r.district].filter(Boolean).join(", ") || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">{isBn ? "যোগাযোগ" : "Contact"}:</span>{" "}
                        <span className="font-semibold text-slate-700">{r.contact_number || "-"}</span>
                      </div>
                      {(r.needed_date || r.when_needed) && (
                        <div>
                          <span className="text-slate-400">{isBn ? "প্রয়োজন" : "Needed"}:</span>{" "}
                          <span className="font-semibold text-slate-700">
                            {formatWhenNeededDynamic(r.when_needed || "", r.created_at || "", r.needed_date, r.needed_time, locale)}
                          </span>
                        </div>
                      )}
                      {r.reason && (
                        <div className="col-span-2">
                          <span className="text-slate-400">{isBn ? "কারণ" : "Reason"}:</span>{" "}
                          <span className="font-semibold text-slate-700">{r.reason}</span>
                        </div>
                      )}
                    </div>

                    {!hidden && r.status === "active" && (
                      <button
                        onClick={() => handleMarkFulfilled(r.id)}
                        disabled={fulfillingId === r.id}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {fulfillingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        {isBn ? "সম্পন্ন হিসেবে চিহ্নিত করুন" : "Mark as Fulfilled"}
                      </button>
                    )}

                    {(r.status === "fulfilled" || hidden) && (
                      <button
                        onClick={() => handleRequestAgain(r)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isBn ? "আবার রিকোয়েস্ট করুন" : "Request Again"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-red-600" />
                {isBn ? "রিকোয়েস্ট এডিট করুন" : "Edit Request"}
              </h3>
              <button
                onClick={() => setEditingRequest(null)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isBn ? "রোগীর নাম" : "Patient Name"}
                </label>
                <input
                  value={editForm.patient_name}
                  onChange={(e) => setEditForm({ ...editForm, patient_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isBn ? "বয়স" : "Age"}
                  </label>
                  <input
                    type="number"
                    value={editForm.patient_age}
                    onChange={(e) => setEditForm({ ...editForm, patient_age: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isBn ? "ইউনিট" : "Units"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.units_needed}
                    onChange={(e) => setEditForm({ ...editForm, units_needed: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isBn ? "জরুরিতা" : "Urgency"}
                </label>
                <select
                  value={editForm.urgency_level}
                  onChange={(e) => setEditForm({ ...editForm, urgency_level: e.target.value })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="normal">{isBn ? "সাধারণ" : "Normal"}</option>
                  <option value="urgent">{isBn ? "আর্জেন্ট" : "Urgent"}</option>
                  <option value="critical">{isBn ? "জরুরি" : "Critical"}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isBn ? "হাসপাতালের নাম" : "Hospital Name"}
                </label>
                <input
                  value={editForm.hospital_name}
                  onChange={(e) => setEditForm({ ...editForm, hospital_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isBn ? "হাসপাতালের ঠিকানা" : "Hospital Address"}
                </label>
                <textarea
                  rows={2}
                  value={editForm.hospital_address}
                  onChange={(e) => setEditForm({ ...editForm, hospital_address: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isBn ? "যোগাযোগ নম্বর" : "Contact Number"}
                  </label>
                  <input
                    value={editForm.contact_number}
                    onChange={(e) => setEditForm({ ...editForm, contact_number: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isBn ? "বিকল্প নম্বর" : "Alt. Number"}
                  </label>
                  <input
                    value={editForm.alternative_number}
                    onChange={(e) =>
                      setEditForm({ ...editForm, alternative_number: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isBn ? "কারণ" : "Reason"}
                </label>
                <textarea
                  rows={2}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold text-sm hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isBn ? "সেভ করুন" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
