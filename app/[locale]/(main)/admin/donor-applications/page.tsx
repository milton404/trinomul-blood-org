"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  serverGetDonorApplications,
  serverApproveDonorApplication,
  serverRejectDonorApplication,
} from "@/lib/db-actions";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  ChevronDown,
} from "lucide-react";

interface Application {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  email: string;
  phone: string;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  avatar_url: string | null;
  weight_kg: number | null;
  sex: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  hb_level: number | null;
  has_chronic_disease: number;
  disease_details: string | null;
  last_donation_date: string | null;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
}

export default function AdminDonorApplicationsPage() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectNoteInvalid, setRejectNoteInvalid] = useState(false);
  const rejectNoteRef = useRef<HTMLTextAreaElement>(null);
  const [approving, setApproving] = useState(false);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const result = await serverGetDonorApplications({ search: search || undefined });
      setApps(result.rows as Application[]);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, []);

  const handleSearch = () => fetchApps();

  const handleApprove = async (id: number) => {
    try {
      setApproving(true);
      await serverApproveDonorApplication(id);
      toast.success("Donor approved!");
      setSelected(null);
      fetchApps();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectNote.trim()) {
      setRejectNoteInvalid(true);
      rejectNoteRef.current?.focus();
      toast.error("Please provide a reason for rejection");
      return;
    }
    try {
      setApproving(true);
      await serverRejectDonorApplication(selected.id, rejectNote);
      toast.success("Application rejected");
      setSelected(null);
      setRejectNote("");
      setRejectNoteInvalid(false);
      fetchApps();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Donor Applications</h1>
          <p className="text-sm text-slate-500">Review and approve donor registration applications</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-200">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by name, phone, or email..."
          className="flex-1 outline-none text-sm"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">No applications found</p>
          <p className="text-sm mt-1">Pending donor applications will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Blood</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">District</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Applied</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {app.avatar_url ? (
                          <img src={app.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-xs">
                              {(app.full_name_en || "?")[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{app.full_name_en || app.full_name_bn || "N/A"}</p>
                          <p className="text-xs text-slate-400">{app.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {app.blood_group ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                          {app.blood_group}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{app.district || "N/A"}</td>
                    <td className="px-4 py-3 text-slate-600">{app.phone}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        app.verification_status === "verified"
                          ? "bg-green-100 text-green-700"
                          : app.verification_status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {app.verification_status === "verified" ? "Approved" :
                         app.verification_status === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(app)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Application Detail</h3>
                <button
                  onClick={() => { setSelected(null); setRejectNote(""); setRejectNoteInvalid(false); }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-2">Photo</p>
                {selected.avatar_url ? (
                  <a
                    href={selected.avatar_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open full size"
                    className="block w-32 h-32 mx-auto"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.avatar_url}
                      alt="Applicant photo"
                      className="w-32 h-32 rounded-2xl object-cover border border-slate-200 hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <div className="w-32 h-32 mx-auto rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                    <span className="text-xs text-slate-400">No photo uploaded</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Name (EN)</p>
                  <p className="font-medium text-slate-800">{selected.full_name_en || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Name (BN)</p>
                  <p className="font-medium text-slate-800">{selected.full_name_bn || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Email</p>
                  <p className="font-medium text-slate-800">{selected.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Phone</p>
                  <p className="font-medium text-slate-800">{selected.phone}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Blood Group</p>
                  <p className="font-medium text-red-600">{selected.blood_group || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Sex</p>
                  <p className="font-medium text-slate-800">{selected.sex || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Date of Birth</p>
                  <p className="font-medium text-slate-800">{selected.date_of_birth || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Weight</p>
                  <p className="font-medium text-slate-800">{selected.weight_kg ? selected.weight_kg + " kg" : "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">District</p>
                  <p className="font-medium text-slate-800">{selected.district || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Upazila</p>
                  <p className="font-medium text-slate-800">{selected.upazila || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Occupation</p>
                  <p className="font-medium text-slate-800">{selected.occupation || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Hb Level</p>
                  <p className="font-medium text-slate-800">{selected.hb_level ? selected.hb_level + " g/dL" : "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Chronic Disease</p>
                  <p className="font-medium text-slate-800">{selected.has_chronic_disease ? "Yes" : "No"}</p>
                  {selected.disease_details && (
                    <p className="text-red-500 text-xs">{selected.disease_details}</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Last Donation</p>
                  <p className="font-medium text-slate-800">{selected.last_donation_date || "Never"}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Applied</p>
                  <p className="font-medium text-slate-800 text-xs">
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {selected.verification_status === "pending" ? (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Rejection Reason (required to reject)
                    </label>
                    <textarea
                      ref={rejectNoteRef}
                      value={rejectNote}
                      onChange={(e) => {
                        setRejectNote(e.target.value);
                        if (e.target.value.trim()) setRejectNoteInvalid(false);
                      }}
                      rows={2}
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-red-500 ${
                        rejectNoteInvalid
                          ? "border-red-400 ring-1 ring-red-300"
                          : "border-slate-300"
                      }`}
                      placeholder="e.g., Incomplete information, Invalid contact..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selected.id)}
                      disabled={approving}
                      className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:bg-green-300 transition-colors flex items-center justify-center gap-2"
                    >
                      {approving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={approving}
                      title={rejectNote.trim() ? undefined : "Enter a rejection reason first"}
                      className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                        rejectNote.trim()
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-red-400 hover:bg-red-500"
                      } disabled:bg-red-300`}
                    >
                      {approving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              ) : selected.verification_status === "rejected" ? (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-red-600">Rejected</p>
                  {selected.verification_note && (
                    <p className="text-xs text-slate-500 mt-1">{selected.verification_note}</p>
                  )}
                </div>
              ) : (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-green-600">Already Approved</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
