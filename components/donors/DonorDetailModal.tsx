"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import DonorCard from "@/components/donors/DonorCard";

interface DonorDetailModalProps {
  donor: any | null;
  onClose: () => void;
}

export default function DonorDetailModal({ donor, onClose }: DonorDetailModalProps) {
  const locale = useLocale();
  const isBn = locale === "bn";

  useEffect(() => {
    if (!donor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [donor, onClose]);

  return (
    <AnimatePresence>
      {donor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-red-50 text-slate-600 hover:text-red-600 shadow-md transition-colors"
              aria-label={isBn ? "বন্ধ করুন" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-h-[85vh] overflow-y-auto">
              <DonorCard
                donor={{
                  id: donor.id,
                  full_name: donor.full_name_en || donor.full_name_bn,
                  blood_group: donor.blood_group,
                  district: donor.district,
                  upazila: donor.upazila,
                  union_name: donor.union_name,
                  total_donations: donor.total_donations || 0,
                  is_active: donor.is_active,
                  is_eligible: donor.is_eligible,
                  next_eligible_date: donor.next_eligible_date,
                  donation_type: donor.donation_type || "whole_blood",
                  eligible_whole_blood: donor.eligible_whole_blood,
                  eligible_platelets: donor.eligible_platelets,
                  eligible_plasma: donor.eligible_plasma,
                  eligible_types_count: donor.eligible_types_count,
                  badges: donor.badges || [],
                  phone: donor.phone,
                  avatar_url: donor.avatar_url,
                  total_referrals: donor.total_referrals || 0,
                  total_units: donor.total_units || 0,
                  hb_status: donor.hb_status,
                  is_verified: donor.is_verified,
                  verification_status: donor.verification_status,
                  is_anonymous: donor.is_anonymous,
                  last_active_at: donor.last_active_at,
                  created_at: donor.created_at,
                  response_count: donor.response_count,
                  response_total_ms: donor.response_total_ms,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}