"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import { Award, Download, Loader2, LogIn } from "lucide-react";
import { serverGetMyCertificates } from "@/lib/db-actions";

type Certificate = {
  id: number;
  certificate_number: string;
  metadata: {
    donorName?: string;
    bloodGroup?: string;
    units?: number;
    donationType?: string;
    hospitalName?: string | null;
    donationDate?: string;
  };
  created_at: string;
};

export default function CertificatesPage() {
  const locale = useLocale();
  const isBn = locale === "bn";
  const { user } = useAuthStore();
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    serverGetMyCertificates()
      .then((r) => {
        if (active) setCerts(r as Certificate[]);
      })
      .catch(() => {
        if (active) setCerts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Award className="w-7 h-7 text-emerald-600" />
            {isBn ? "রক্তদান সনদপত্র" : "Donation Certificates"}
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            {isBn
              ? "আপনার প্রতিটি রক্তদানের জন্য ডাউনলোডযোগ্য সনদপত্র"
              : "A downloadable certificate for each of your donations"}
          </p>

          {!user?.id ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <LogIn className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-2">
                {isBn ? "লগইন প্রয়োজন" : "Login required"}
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
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : certs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Award className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-2">
                {isBn ? "কোনো সনদপত্র নেই" : "No certificates yet"}
              </p>
              <p className="text-sm text-slate-500">
                {isBn
                  ? "রক্তদান করলে স্বয়ংক্রিয়ভাবে সনদপত্র তৈরি হবে"
                  : "Record a donation to receive your first certificate"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {certs.map((c) => {
                const m = c.metadata || {};
                const typeLabel = m.donationType?.replace(/_/g, " ") ?? "whole blood";
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-xs font-mono text-slate-400 mb-1">
                          {c.certificate_number}
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {m.bloodGroup ?? "—"} · {m.units ?? 1} unit(s)
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold capitalize">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 mb-4">
                      {m.donationDate?.slice(0, 10) ?? "—"}
                      {m.hospitalName ? ` · ${m.hospitalName}` : ""}
                    </div>
                    <a
                      href={`/api/certificates/${c.id}`}
                      download={`certificate-${c.certificate_number}.png`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      {isBn ? "ডাউনলোড" : "Download"}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}