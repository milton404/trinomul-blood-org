"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import DonorCard from "@/components/donors/DonorCard";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import { Bookmark, Loader2, LogIn } from "lucide-react";
import { serverGetBookmarkedDonors } from "@/lib/db-actions";

export default function BookmarksPage() {
  const locale = useLocale();
  const isBn = locale === "bn";
  const { user } = useAuthStore();
  const router = useRouter();
  const [donors, setDonors] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    let active = true;
    serverGetBookmarkedDonors()
      .then((result) => {
        if (active) setDonors(result);
      })
      .catch(() => {
        if (active) setDonors([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const formatDonorForCard = (d: Record<string, unknown>) => ({
    id: d.id as number,
    full_name: isBn ? (d.full_name_bn as string) || (d.full_name_en as string) : (d.full_name_en as string) || (d.full_name_bn as string),
    blood_group: d.blood_group as string,
    district: d.district as string,
    upazila: d.upazila as string,
    total_donations: (d.total_donations as number) || 0,
    is_active: (d.is_active as boolean) ?? true,
    badges: [] as string[],
    phone: d.phone as string | undefined,
    avatar_url: d.avatar_url as string | undefined,
    is_verified: d.is_verified as boolean | number | undefined,
    verification_status: d.verification_status as string | undefined,
    is_anonymous: d.is_anonymous as boolean | number | undefined,
    last_active_at: d.last_active_at as string | null | undefined,
    created_at: d.created_at as string | null | undefined,
    response_count: d.response_count as number | undefined,
    response_total_ms: d.response_total_ms as number | undefined,
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Bookmark className="w-7 h-7 text-emerald-600" />
            {isBn ? "সংরক্ষিত রক্তদাতা" : "Saved Donors"}
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            {isBn
              ? "আপনি যে রক্তদাতাদের সংরক্ষণ করেছেন তাদের তালিকা"
              : "Donors you have bookmarked for quick access"}
          </p>

          {!user?.id ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <LogIn className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-2">
                {isBn ? "লগইন প্রয়োজন" : "Login required"}
              </p>
              <p className="text-sm text-slate-500 mb-6">
                {isBn
                  ? "সংরক্ষিত রক্তদাতা দেখতে প্রথমে লগইন করুন"
                  : "Please log in to view your bookmarked donors"}
              </p>
              <button
                onClick={() => router.push("/login")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {isBn ? "লগইন করুন" : "Login"}
              </button>
            </div>
          ) : loading ? (
            <CardGridSkeleton count={4} />
          ) : donors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Bookmark className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-2">
                {isBn ? "কোনো সংরক্ষিত রক্তদাতা নেই" : "No bookmarked donors"}
              </p>
              <p className="text-sm text-slate-500 mb-6">
                {isBn
                  ? "রক্তদাতা তালিকা থেকে সংরক্ষণ বোতাম চাপুন"
                  : "Bookmark donors from the donor directory to save them here"}
              </p>
              <button
                onClick={() => router.push("/donors")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              >
                {isBn ? "রক্তদাতা খুঁজুন" : "Find Donors"}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-4">
                {isBn ? `${donors.length} জন রক্তদাতা` : `${donors.length} donors`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {donors.map((donor) => (
                  <DonorCard key={donor.id as number} donor={formatDonorForCard(donor)} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}