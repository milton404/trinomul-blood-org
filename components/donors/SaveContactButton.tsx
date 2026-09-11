"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

interface SaveContactButtonProps {
  fullName: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  district?: string;
  upazila?: string;
  /** Compact mode — icon only, no text. */
  compact?: boolean;
}

/**
 * Generates a vCard (.vcf) file from donor contact info and triggers a
 * download. The vCard 3.0 format is compatible with most phone contact apps.
 */
export default function SaveContactButton({
  fullName,
  phone,
  email,
  bloodGroup,
  district,
  upazila,
  compact = false,
}: SaveContactButtonProps) {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [loading, setLoading] = useState(false);

  const handleSave = useCallback(() => {
    setLoading(true);
    try {
      const displayFn = bloodGroup ? `${fullName} (${bloodGroup})` : fullName;
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${displayFn}`,
        `N:${fullName};;;;`,
      ];
      if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
      if (email) lines.push(`EMAIL:${email}`);
      const addressParts = [upazila, district].filter(Boolean);
      if (addressParts.length > 0) {
        lines.push(`ADR;TYPE=HOME:;;${addressParts.join(", ")};;;;`);
      }
      if (bloodGroup) {
        lines.push(`NOTE:Blood Group: ${bloodGroup} - Trinomul Blood Bank Rangpur`);
      } else {
        lines.push("NOTE:Trinomul Blood Bank Rangpur");
      }
      lines.push("END:VCARD");

      const vcard = lines.join("\r\n");
      const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fullName.replace(/\s+/g, "_")}.vcf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(isBn ? "কন্টাক্ট সংরক্ষিত হয়েছে" : "Contact saved");
    } catch {
      toast.error(isBn ? "ব্যর্থ" : "Failed");
    } finally {
      setLoading(false);
    }
  }, [fullName, phone, email, bloodGroup, district, upazila, isBn]);

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
      title={isBn ? "কন্টাক্ট সংরক্ষণ" : "Save contact"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {!compact && (isBn ? "কন্টাক্ট" : "Contact")}
    </button>
  );
}