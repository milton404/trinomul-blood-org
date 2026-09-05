"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  MapPin,
  Phone,
  MessageCircle,
  Search,
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  RefreshCw,
  Navigation,
} from "lucide-react";
import {
  serverFindMatchingDonors,
  serverRecordDonorMatches,
  serverGetDonorMatchesForRequest,
  serverAddStatusLog,
  serverUpdateDonorMatchResponse,
} from "@/lib/db-actions";

interface DonorMatch {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  lat: number | null;
  lng: number | null;
  last_donation_date: string | null;
  is_eligible: number;
  total_donations: number;
  match_rank: number;
  match_score: number;
  match_reasons: string[];
  distance_km: number | null;
}

interface ExistingMatch {
  id: number;
  request_id: number;
  donor_id: number;
  match_rank: number;
  match_score: number;
  notification_method: string;
  response_status: string;
  responded_at: string | null;
  created_at: string;
  full_name_en: string | null;
  full_name_bn: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
}

interface DonorMatchPanelProps {
  requestId: number;
  bloodGroup: string;
  district?: string;
  upazila?: string;
  lat?: number | null;
  lng?: number | null;
  urgencyLevel: string;
  patientName: string;
  hospitalName: string;
}

export default function DonorMatchPanel({
  requestId,
  bloodGroup,
  district,
  upazila,
  lat,
  lng,
  urgencyLevel,
  patientName,
  hospitalName,
}: DonorMatchPanelProps) {
  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [existingMatches, setExistingMatches] = useState<ExistingMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadExistingMatches = useCallback(async () => {
    try {
      const result = (await serverGetDonorMatchesForRequest(requestId)) as ExistingMatch[];
      setExistingMatches(result);
    } catch (err) {
      console.error("Error loading existing matches:", err);
    }
  }, [requestId]);

  useEffect(() => {
    loadExistingMatches();
  }, [loadExistingMatches]);

  const handleFindMatches = async () => {
    setIsLoading(true);
    try {
      const result = (await serverFindMatchingDonors(
        bloodGroup,
        district,
        upazila,
        urgencyLevel,
        undefined,
        lat,
        lng,
      )) as DonorMatch[];
      setMatches(result);
      setHasSearched(true);
    } catch (err) {
      console.error("Error finding matches:", err);
    }
    setIsLoading(false);
  };

  const handleNotifyAll = async () => {
    if (matches.length === 0) return;
    setIsNotifying(true);
    try {
      // Record all matches in the database
      await serverRecordDonorMatches(requestId, matches, "sms");

      // Update request status to "matching"
      await serverAddStatusLog(requestId, "matching", "admin", "Donor matching initiated");

      // Reload existing matches
      await loadExistingMatches();

      // In production, this would trigger SMS/WhatsApp API calls.
      // For now, we open WhatsApp links for each donor.
      for (const m of matches.slice(0, urgencyLevel === "critical" ? 10 : 5)) {
        const phone = m.whatsapp_number || m.phone;
        if (phone) {
          const cleaned = phone.replace(/[^0-9]/g, "");
          const msg = encodeURIComponent(
            `🩸 URGENT BLOOD REQUEST\n\nPatient: ${patientName}\nBlood Group: ${bloodGroup}\nHospital: ${hospitalName}\n${district ? "Location: " + district : ""}\n\nCan you donate? Reply YES or NO.`,
          );
          window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
        }
      }
    } catch (err) {
      console.error("Error notifying donors:", err);
    }
    setIsNotifying(false);
  };

  const handleUpdateResponse = async (
    donorId: number,
    response: "accepted" | "declined" | "no_response",
  ) => {
    try {
      await serverUpdateDonorMatchResponse(requestId, donorId, response);
      await loadExistingMatches();

      // If accepted, update request status to donor_found
      if (response === "accepted") {
        await serverAddStatusLog(
          requestId,
          "donor_found",
          "admin",
          "A donor has accepted the request",
        );
      }
    } catch (err) {
      console.error("Error updating response:", err);
    }
  };

  const getReasonBadge = (reason: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      exact_blood_match: { label: "Exact Match", color: "bg-green-100 text-green-700" },
      compatible_blood: { label: "Compatible", color: "bg-blue-100 text-blue-700" },
      same_district: { label: "Same District", color: "bg-purple-100 text-purple-700" },
      never_donated: { label: "New Donor", color: "bg-amber-100 text-amber-700" },
    };
    const b = badges[reason];
    return b ? (
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${b.color}`}>
        {b.label}
      </span>
    ) : null;
  };

  const getResponseStatus = (donorId: number) => {
    const existing = existingMatches.find((m) => m.donor_id === donorId);
    return existing?.response_status || null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h3 className="font-bold text-sm">Smart Donor Matching</h3>
          </div>
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
            {bloodGroup} • {urgencyLevel}
          </span>
        </div>
        <p className="text-xs text-red-100 mt-1">
          Automatically find and rank the best matching donors
        </p>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <button
          onClick={handleFindMatches}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {hasSearched ? "Refresh Matches" : "Find Matching Donors"}
        </button>

        {matches.length > 0 && (
          <button
            onClick={handleNotifyAll}
            disabled={isNotifying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isNotifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Notify Top {urgencyLevel === "critical" ? 10 : 5} via WhatsApp
          </button>
        )}

        {existingMatches.length > 0 && (
          <button
            onClick={loadExistingMatches}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Status
          </button>
        )}
      </div>

      {/* New Matches List */}
      {matches.length > 0 && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Top {matches.length} Ranked Donors
          </p>
          {matches.map((donor) => {
            const responseStatus = getResponseStatus(donor.id);
            return (
              <div
                key={donor.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
              >
                {/* Rank Badge */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                    donor.match_rank === 1
                      ? "bg-amber-100 text-amber-700"
                      : donor.match_rank <= 3
                        ? "bg-slate-100 text-slate-600"
                        : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {donor.match_rank === 1 && <Trophy className="w-4 h-4" />}
                  {donor.match_rank !== 1 && `#${donor.match_rank}`}
                </div>

                {/* Donor Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {donor.full_name_en || donor.full_name_bn || "Unknown"}
                    </p>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">
                      {donor.blood_group}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {donor.upazila || donor.district || "N/A"}
                    </span>
                    {donor.distance_km != null && (
                      <span className="text-slate-400">• {donor.distance_km} km away</span>
                    )}
                    {donor.total_donations > 0 && (
                      <span className="text-slate-400">
                        • {donor.total_donations} donations
                      </span>
                    )}
                  </div>
                  {/* Match reasons */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {donor.match_reasons.map((r) => (
                      <span key={r}>{getReasonBadge(r)}</span>
                    ))}
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                      Score: {donor.match_score}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {responseStatus && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        responseStatus === "accepted"
                          ? "bg-green-100 text-green-700"
                          : responseStatus === "declined"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {responseStatus === "accepted" && "✓ Accepted"}
                      {responseStatus === "declined" && "✗ Declined"}
                      {responseStatus === "pending" && "⏳ Pending"}
                    </span>
                  )}
                  {donor.phone && (
                    <a
                      href={`tel:${donor.phone}`}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="Call donor"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {(donor.whatsapp_number || donor.phone) && (
                    <a
                      href={`https://wa.me/${(donor.whatsapp_number || donor.phone)!.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                      title="WhatsApp donor"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Existing Matches with Response Tracking */}
      {existingMatches.length > 0 && (
        <div className="p-4 border-t border-slate-100 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Notified Donors — Response Tracking
          </p>
          {existingMatches.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] bg-white border border-slate-200 text-slate-500">
                #{m.match_rank}
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">
                  {m.full_name_en || m.full_name_bn || "Unknown"}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="px-1 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[9px]">
                    {m.blood_group}
                  </span>
                  <span>{m.phone || "No phone"}</span>
                  <span className="text-slate-400">• {m.district || "N/A"}</span>
                </div>
              </div>

              {/* Response Status */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {m.response_status === "accepted" && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-bold">
                    <CheckCircle className="w-3 h-3" /> Accepted
                  </span>
                )}
                {m.response_status === "declined" && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold">
                    <XCircle className="w-3 h-3" /> Declined
                  </span>
                )}
                {m.response_status === "pending" && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}

                {/* Manual response buttons */}
                {m.response_status === "pending" && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      onClick={() => handleUpdateResponse(m.donor_id, "accepted")}
                      className="p-1 rounded text-green-600 hover:bg-green-50"
                      title="Mark as accepted"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUpdateResponse(m.donor_id, "declined")}
                      className="p-1 rounded text-red-600 hover:bg-red-50"
                      title="Mark as declined"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {!hasSearched && existingMatches.length === 0 && !isLoading && (
        <div className="p-8 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">
            Click &ldquo;Find Matching Donors&rdquo; to automatically search for
            compatible, eligible donors ranked by blood type, proximity, and
            donation history.
          </p>
        </div>
      )}

      {hasSearched && matches.length === 0 && !isLoading && (
        <div className="p-8 text-center">
          <XCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">
            No eligible donors found for blood group {bloodGroup}
            {district ? ` in ${district}` : ""}. Try expanding your search.
          </p>
        </div>
      )}
    </div>
  );
}
