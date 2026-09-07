"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Heart, ShieldCheck, ArrowDown } from "lucide-react";
import RegisterForm from "@/components/auth/RegisterForm";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import DonorEligibilityChecker from "@/components/donors/DonorEligibilityChecker";
import { BloodDropLoading } from "@/components/ui/BloodDropLoading";

const ELIGIBILITY_STORAGE_KEY = "donor_eligibility_onboarding";

function RegisterContent() {
  const searchParams = useSearchParams();
  const roleParam = (searchParams.get("role") || "").toLowerCase();
  const isDonorFlow = roleParam === "donor";

  // Donor onboarding state — auto-shown for ?role=donor, collapsible.
  const [showEligibility, setShowEligibility] = useState(isDonorFlow);
  const [eligibilityDone, setEligibilityDone] = useState<{
    eligible: boolean;
    answers: Record<string, any>;
  } | null>(null);

  const handleEligibilityComplete = (data: {
    eligible: boolean;
    answers: Record<string, any>;
  }) => {
    setEligibilityDone(data);
    // Persist age/weight so DonorCompleteForm can pre-fill later.
    try {
      localStorage.setItem(ELIGIBILITY_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center py-16 px-4 gap-6">
        {/* Eligibility onboarding — DONOR ONLY */}
        {isDonorFlow && (
          <div className="w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setShowEligibility((v) => !v)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-white/80 backdrop-blur px-5 py-4 shadow-sm hover:shadow-md transition-all"
              aria-expanded={showEligibility}
            >
              <span className="flex items-center gap-3 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Heart className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Donor Eligibility Onboarding
                  </span>
                  <span className="block text-xs text-slate-500">
                    {eligibilityDone
                      ? eligibilityDone.eligible
                        ? "✅ Eligible — continue to registration below"
                        : "See results — you can still register"
                      : "Quick 8-question check before you register"}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={`h-5 w-5 text-slate-500 transition-transform ${
                  showEligibility ? "rotate-180" : ""
                }`}
              />
            </button>

            {showEligibility && (
              <div className="mt-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Take the check — your answers pre-fill fields in your donor
                  profile later.
                </div>
                <DonorEligibilityChecker onComplete={handleEligibilityComplete} />

                {eligibilityDone && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowEligibility(false)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Continue to registration
                      <ArrowDown className="h-4 w-4 animate-bounce" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <RegisterForm defaultRole={roleParam || undefined} />
      </main>
      <Footer />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar />
          <main className="flex-grow flex items-center justify-center py-20 px-4">
            <BloodDropLoading label="Loading" size={80} />
          </main>
          <Footer />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
