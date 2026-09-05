"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { X, Loader2, Droplet } from "lucide-react";
import { serverCreateDonation } from "@/lib/db-actions";

interface QuickAddDonationModalProps {
  donorId: number;
  donorName: string;
  bloodGroup: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickAddDonationModal({
  donorId,
  donorName,
  bloodGroup,
  onClose,
  onSuccess,
}: QuickAddDonationModalProps) {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState(1);
  const [hospitalName, setHospitalName] = useState("");
  const [donationDate, setDonationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [donationType, setDonationType] = useState("whole_blood");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName.trim()) {
      toast.error(isBn ? "হাসপাতালের নাম প্রয়োজন" : "Hospital name required");
      return;
    }
    setLoading(true);
    try {
      await serverCreateDonation({
        donorId,
        requestId: null,
        bloodGroup,
        units,
        hospitalName: hospitalName.trim(),
        donationDate,
        donationType,
        recipientType: "patient",
      });
      toast.success(isBn ? "রক্তদান রেকর্ড করা হয়েছে" : "Donation recorded");
      onSuccess();
      onClose();
    } catch {
      toast.error(isBn ? "ব্যর্থ" : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-red-600" />
            {isBn ? "রক্তদান যোগ করুন" : "Add Donation"}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" aria-label="Close">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          {donorName} — <span className="font-bold text-red-600">{bloodGroup}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isBn ? "একক" : "Units"}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isBn ? "তারিখ" : "Date"}
              </label>
              <input
                type="date"
                value={donationDate}
                onChange={(e) => setDonationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isBn ? "হাসপাতালের নাম" : "Hospital Name"}
            </label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder={isBn ? "হাসপাতালের নাম" : "Hospital name"}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isBn ? "রক্তদানের ধরন" : "Donation Type"}
            </label>
            <select
              value={donationType}
              onChange={(e) => setDonationType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
            >
              <option value="whole_blood">{isBn ? "সম্পূর্ণ রক্ত" : "Whole Blood"}</option>
              <option value="platelets">{isBn ? "প্লাটলেট" : "Platelets"}</option>
              <option value="plasma">{isBn ? "প্লাজমা" : "Plasma"}</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {isBn ? "বাতিল" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Droplet className="w-4 h-4" />
              )}
              {isBn ? "সংরক্ষণ" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}