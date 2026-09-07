"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatWhenNeededDynamic } from "@/lib/utils/when-needed";
import {
  ArrowLeft,
  Droplet,
  Hospital,
  MapPin,
  Clock,
  Phone,
  Navigation,
  QrCode,
  Search,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

import { BloodDropLoading } from "@/components/ui/BloodDropLoading";
import {
  serverGetBloodRequestById,
  serverGetBloodRequestByTrackingCode,
  serverGetStatusLogs,
  serverCheckGuestEditEligibility,
  serverRunLifecycleSweep,
  serverAddStatusLog,
} from "@/lib/db-actions";
import RequestStatusTimeline from "@/components/requests/RequestStatusTimeline";
import GuestEditRequestModal from "@/components/requests/GuestEditRequestModal";

export default function TrackingPage() {
  const params = useParams();
  const rawId = params.id as string;

  const [request, setRequest] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const copyTrackingCode = async () => {
    const code = request?.tracking_code || rawId;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1600);
    } catch {}
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);

    try {
      // Advance lifecycle (auto-expire + 48h purge) before resolving the QR,
      // so a scan for a past-due request shows "expired" instead of "active".
      await serverRunLifecycleSweep();

      let req: any = null;

      // Try numeric ID first, then tracking code
      if (/^\d+$/.test(rawId)) {
        req = await serverGetBloodRequestById(parseInt(rawId));
      } else {
        req = await serverGetBloodRequestByTrackingCode(rawId);
      }

      if (!req) {
        // Try treating it as a tracking code even if it looked numeric
        req = await serverGetBloodRequestByTrackingCode(rawId);
      }

      if (!req) {
        setNotFound(true);
        setRequest(null);
        setLogs([]);
        return;
      }

      setRequest(req);

      // Load status logs
      const statusLogs = await serverGetStatusLogs(req.id);
      setLogs(statusLogs as any[]);

      // Check if current visitor can edit this guest request (IP/UA match)
      try {
        const eligible = await serverCheckGuestEditEligibility(req.id);
        setCanEdit(eligible);
      } catch {
        setCanEdit(false);
      }
    } catch (err) {
      console.error("Error loading tracking data:", err);
      setNotFound(true);
    }
    setIsLoading(false);
  }, [rawId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    window.location.href = `/${params.locale}/track/${searchCode.trim()}`;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!request || newStatus === currentStatus) return;
    try {
      await serverAddStatusLog(request.id, newStatus, "requester");
      await loadData();
    } catch (err: any) {
      console.error("Status update failed:", err);
    }
  };

  // QR code using a public QR code API
  const trackingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${params.locale}/track/${rawId}`
      : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-6">
        <BloodDropLoading label="Loading" size={80} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <Droplet className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Request Completed or Removed
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            This blood request was either fulfilled, expired, or deleted, and
            has been permanently removed after the 48-hour retention window.
          </p>
          <p className="text-xs text-slate-400 mb-6 font-mono break-all">
            Tracking code: &ldquo;{rawId}&rdquo;
          </p>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Enter tracking code (e.g. REQ-AB12CD)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
            >
              Track Another Request
            </button>
          </form>

          <Link
            href={`/${params.locale}/requests`}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = request?.current_status || "submitted";
  const hasCoords = request?.lat != null && request?.lng != null;
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`
    : null;

  const urgencyColors: Record<string, string> = {
    critical: "bg-red-600 text-white",
    urgent: "bg-amber-500 text-white",
    normal: "bg-blue-500 text-white",
  };

  const statusHeaderColors: Record<string, string> = {
    submitted: "from-blue-600 to-blue-700",
    matching: "from-amber-500 to-amber-600",
    donor_found: "from-green-600 to-green-700",
    donating: "from-purple-600 to-purple-700",
    fulfilled: "from-green-700 to-emerald-700",
    cancelled: "from-red-600 to-red-700",
    expired: "from-slate-500 to-slate-600",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${
          statusHeaderColors[currentStatus] || "from-red-600 to-red-700"
        } text-white`}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-3">
            <Link
              href={`/${params.locale}/requests`}
              className="flex items-center gap-1 text-white/80 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Droplet className="w-6 h-6 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold">Blood Request Tracking</h1>
                {request?.tracking_code && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-white/80 mt-0.5 font-mono">
                    {request.tracking_code}
                    <button
                      onClick={copyTrackingCode}
                      className={`p-1 rounded-md transition-colors ${
                        codeCopied
                          ? "bg-white/20 text-white"
                          : "bg-white/10 hover:bg-white/25 text-white/80"
                      }`}
                      title="Copy tracking code"
                      aria-label="Copy tracking code"
                    >
                      {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  urgencyColors[request?.urgency_level] || "bg-slate-200 text-slate-700"
                }`}
              >
                {request?.urgency_level}
              </span>
              <span className="text-3xl font-black leading-none">{request?.blood_group}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Search another request by tracking code */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-center gap-2"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Enter tracking code (e.g. REQ-AB12CD)"
            className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!searchCode.trim()}
            className="shrink-0 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Track
          </button>
        </form>

        {/* Request Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
            Request Details
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Patient
              </p>
              <p className="font-semibold text-slate-900 truncate">
                {request?.patient_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Units Needed
              </p>
              <p className="font-semibold text-slate-900">{request?.units_needed}</p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Hospital
              </p>
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Hospital className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {request?.hospital_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Location
              </p>
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {request?.upazila}, {request?.district}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                When Needed
              </p>
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {formatWhenNeededDynamic(request?.when_needed || "", request?.created_at || "", request?.needed_date, request?.needed_time)}
              </p>
            </div>

            {request?.contact_number && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Contact
                </p>
                <a
                  href={`tel:${request.contact_number}`}
                  className="font-semibold text-red-600 flex items-center gap-1.5 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {request.contact_number}
                </a>
              </div>
            )}
          </div>

          {request?.reason && (
            <p className="text-sm text-slate-600 italic mt-3 pt-3 border-t border-slate-100">
              {request.reason}
            </p>
          )}

          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95"
              style={{ background: "#4285F4" }}
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </a>
          )}

          {canEdit && (
            <button
              onClick={() => setShowEditModal(true)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all"
            >
              {params.locale === "bn" ? "এডিট / বাতিল করুন" : "Edit / Cancel Request"}
            </button>
          )}
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
            Status Timeline
          </h2>
          <RequestStatusTimeline logs={logs} currentStatus={currentStatus} />
          {canEdit && request?.status === "active" && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {params.locale === "bn" ? "স্ট্যাটাস আপডেট করুন" : "Update Status"}
              </label>
              <select
                value={currentStatus}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white text-sm font-medium"
              >
                <option value="submitted">{params.locale === "bn" ? "জমা হয়েছে" : "Submitted"}</option>
                <option value="matching">{params.locale === "bn" ? "দাতা খোঁজা হচ্ছে" : "Matching Donors"}</option>
                <option value="donor_found">{params.locale === "bn" ? "দাতা পাওয়া গেছে" : "Donor Found"}</option>
                <option value="donating">{params.locale === "bn" ? "দান হচ্ছে" : "Donating"}</option>
                <option value="fulfilled">{params.locale === "bn" ? "পূর্ণ হয়েছে" : "Fulfilled"}</option>
              </select>
            </div>
          )}
        </div>

        {/* QR Code + Search another request */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* QR Code */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
            <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-slate-400" />
              Print QR Code
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="QR Code for tracking"
              className="w-32 h-32 mx-auto rounded-lg border border-slate-200"
            />
            <p className="text-xs text-slate-500 mt-2">
              Scan to open this tracking page
            </p>
          </div>

          {/* Search another request */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
              Track Another Request
            </h2>
            <form onSubmit={handleSearch} className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Enter tracking code..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
              >
                Track Request
              </button>
            </form>
          </div>
        </div>
      </div>

      {showEditModal && request && (
        <GuestEditRequestModal
          request={request}
          locale={params.locale as string}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => loadData()}
        />
      )}
    </div>
  );
}
