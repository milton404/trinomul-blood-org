"use client";

import { useState } from "react";
import { X, Save, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  serverUpdateGuestRequest,
  serverCancelGuestRequest,
} from "@/lib/db-actions";

interface GuestEditRequestModalProps {
  request: any;
  locale: string;
  onClose: () => void;
  onUpdated: () => void;
}

const URGENCY_OPTIONS = [
  { value: "normal", en: "Normal", bn: "সাধারণ" },
  { value: "urgent", en: "Urgent", bn: "আর্জেন্ট" },
  { value: "critical", en: "Critical", bn: "জরুরি" },
];

const WHEN_NEEDED_OPTIONS = [
  { value: "now", en: "Now", bn: "এখন" },
  { value: "today", en: "Today", bn: "আজ" },
  { value: "tomorrow", en: "Tomorrow", bn: "আগামীকাল" },
  { value: "day_after", en: "Day After", bn: "পরশু" },
  { value: "within_3_days", en: "Within 3 Days", bn: "৩ দিনের মধ্যে" },
  { value: "within_week", en: "Within a Week", bn: "এক সপ্তাহের মধ্যে" },
  { value: "specific_date", en: "Specific Date", bn: "নির্দিষ্ট তারিখ" },
];

export default function GuestEditRequestModal({
  request,
  locale,
  onClose,
  onUpdated,
}: GuestEditRequestModalProps) {
  const isBn = locale === "bn";
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [form, setForm] = useState({
    patient_name: request?.patient_name || "",
    patient_age: request?.patient_age ?? "",
    units_needed: request?.units_needed ?? 1,
    urgency_level: request?.urgency_level || "normal",
    when_needed: request?.when_needed || "today",
    needed_date: request?.needed_date || "",
    needed_time: request?.needed_time || "",
    hospital_name: request?.hospital_name || "",
    hospital_address: request?.hospital_address || "",
    contact_number: request?.contact_number || "",
    alternative_number: request?.alternative_number || "",
    patient_hb_level: request?.patient_hb_level ?? "",
    reason: request?.reason || "",
  });

  const inputCls =
    "w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm text-slate-800";

  const handleSave = async () => {
    if (!form.patient_name.trim()) {
      toast.error(isBn ? "রোগীর নাম আবশ্যক" : "Patient name is required");
      return;
    }
    if (!form.contact_number.trim()) {
      toast.error(isBn ? "যোগাযোগ নম্বর আবশ্যক" : "Contact number is required");
      return;
    }
    setSaving(true);
    try {
      await serverUpdateGuestRequest(request.id, {
        patient_name: form.patient_name.trim(),
        patient_age: form.patient_age === "" ? null : Number(form.patient_age),
        units_needed: Number(form.units_needed) || 1,
        urgency_level: form.urgency_level,
        when_needed: form.when_needed,
        needed_date:
          form.when_needed === "specific_date" && form.needed_date
            ? form.needed_date
            : null,
        needed_time: form.needed_time || null,
        hospital_name: form.hospital_name.trim(),
        hospital_address: form.hospital_address.trim() || null,
        contact_number: form.contact_number.trim(),
        alternative_number: form.alternative_number.trim() || null,
        reason: form.reason.trim() || null,
        patient_hb_level: form.patient_hb_level ? parseFloat(form.patient_hb_level) : null,
      });
      toast.success(isBn ? "রিকোয়েস্ট আপডেট হয়েছে" : "Request updated successfully");
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || (isBn ? "আপডেট ব্যর্থ" : "Failed to update"));
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await serverCancelGuestRequest(request.id);
      toast.success(isBn ? "রিকোয়েস্ট বাতিল হয়েছে" : "Request cancelled");
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || (isBn ? "বাতিল ব্যর্থ" : "Failed to cancel"));
    }
    setCancelling(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-red-600" />
            {isBn ? "রিকোয়েস্ট এডিট করুন" : "Edit Request"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
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
              value={form.patient_name}
              onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
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
                value={form.patient_age}
                onChange={(e) => setForm({ ...form, patient_age: e.target.value })}
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
                value={form.units_needed}
                onChange={(e) => setForm({ ...form, units_needed: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isBn ? "Hb মাত্রা (g/dL)" : "Hb Level (g/dL)"}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                placeholder="12.5"
                value={form.patient_hb_level}
                onChange={(e) => setForm({ ...form, patient_hb_level: e.target.value })}
                className={inputCls}
              />
              <p className="text-slate-400 text-[10px] mt-0.5">
                {isBn ? "অভ্যন্তরীণ — দাতাদের কাছে দৃশ্যমান নয়" : "Internal — not visible to donors"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isBn ? "জরুরিতা" : "Urgency"}
              </label>
              <select
                value={form.urgency_level}
                onChange={(e) => setForm({ ...form, urgency_level: e.target.value })}
                className={`${inputCls} bg-white`}
              >
                {URGENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {isBn ? o.bn : o.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isBn ? "কখন প্রয়োজন" : "When Needed"}
              </label>
              <select
                value={form.when_needed}
                onChange={(e) => setForm({ ...form, when_needed: e.target.value })}
                className={`${inputCls} bg-white`}
              >
                {WHEN_NEEDED_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {isBn ? o.bn : o.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.when_needed !== "now" && (
            <>
              {form.when_needed === "specific_date" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isBn ? "প্রয়োজনীয় তারিখ" : "Needed Date"}
                  </label>
                  <input
                    type="date"
                    value={form.needed_date}
                    onChange={(e) => setForm({ ...form, needed_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isBn ? "প্রয়োজনীয় সময়" : "Needed Time"}
                </label>
                <input
                  type="time"
                  value={form.needed_time}
                  onChange={(e) => setForm({ ...form, needed_time: e.target.value })}
                  className={inputCls}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {isBn ? "হাসপাতালের নাম" : "Hospital Name"}
            </label>
            <input
              value={form.hospital_name}
              onChange={(e) => setForm({ ...form, hospital_name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {isBn ? "হাসপাতালের ঠিকানা" : "Hospital Address"}
            </label>
            <textarea
              rows={2}
              value={form.hospital_address}
              onChange={(e) => setForm({ ...form, hospital_address: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isBn ? "যোগাযোগ নম্বর" : "Contact Number"}
              </label>
              <input
                value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isBn ? "বিকল্প নম্বর" : "Alt. Number"}
              </label>
              <input
                value={form.alternative_number}
                onChange={(e) =>
                  setForm({ ...form, alternative_number: e.target.value })
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
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold text-sm hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isBn ? "সেভ করুন" : "Save Changes"}
          </button>

          <div className="pt-2 border-t border-slate-100">
            {confirmCancel ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 text-center">
                  {isBn
                    ? "আপনি কি নিশ্চিত? এটি বাতিল করা হলে আর ফিরিয়ে আনা যাবে না।"
                    : "Are you sure? This cannot be undone."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {isBn ? "না" : "No"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {cancelling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    {isBn ? "বাতিল করুন" : "Yes, Cancel"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full py-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isBn ? "রিকোয়েস্ট বাতিল করুন" : "Cancel This Request"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}