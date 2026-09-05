"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useRouter } from "@/i18n/routing";
import {
  ShieldCheck,
  Clock,
  Phone,
  Droplet,
  MapPin,
  IdCard,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { serverGetPendingVerifications } from "@/lib/db-actions";

interface PendingDonor {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  phone: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  nid_number: string | null;
  nid_uploaded_at: string | null;
  verification_status: string;
  phone_verified: number;
  is_verified: number;
  created_at: string;
}

export default function VerificationsQueuePage() {
  const locale = useLocale();
  const isBn = locale === "bn";
  const router = useRouter();

  const [donors, setDonors] = useState<PendingDonor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serverGetPendingVerifications()
      .then((rows) => setDonors((rows as PendingDonor[]) || []))
      .catch(() => setDonors([]))
      .finally(() => setLoading(false));
  }, []);

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

  const name = (d: PendingDonor) =>
    isBn ? d.full_name_bn || d.full_name_en || `#${d.id}` : d.full_name_en || d.full_name_bn || `#${d.id}`;

  if (loading) {
    return <ListSkeleton rows={5} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-red-600" />
          {isBn ? "যাচাইয়ের অপেক্ষমাণ" : "Verification Queue"}
        </h1>
        <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-sm font-bold">
          {donors.length}
        </span>
      </div>

      {donors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
          <p className="text-slate-500 font-medium">
            {isBn ? "কোনো অপেক্ষমাণ নেই" : "No pending verifications"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {isBn ? "সব দাতার NID যাচাই সম্পন্ন হয়েছে।" : "All donor NIDs have been reviewed."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {isBn ? "দাতা" : "Donor"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {isBn ? "রক্তের গ্রুপ" : "Blood"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {isBn ? "ফোন" : "Phone"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {isBn ? "এলাকা" : "Area"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {isBn ? "NID" : "NID"}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {isBn ? "জমা" : "Submitted"}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donors.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/admin/donors/${d.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {name(d)}
                    {!d.phone_verified && (
                      <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-200">
                        {isBn ? "ফোন বাকি" : "Phone?"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {d.blood_group && (
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-xs font-bold">
                        {d.blood_group}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.upazila && d.district ? `${d.upazila}, ${d.district}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                    {d.nid_number ? `…${d.nid_number.slice(-4)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                    {fmtDate(d.nid_uploaded_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ArrowRight className="w-4 h-4 text-slate-400 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}