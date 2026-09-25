"use client";

import { useState, useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { ShieldCheck, Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import {
  serverGetMyAdminContext,
  serverAcceptAdminPolicy,
} from "@/lib/db-actions";

const POLICY_RULES = {
  en: [
    "I will only access, update, or manage data that is required for my administrative duties.",
    "I will never delete donor, patient, or request data unless explicitly authorized by the main admin. (District admins cannot delete any user account.)",
    "If I am a district admin, I will only manage requests, donors, and users within my assigned district.",
    "I understand that every action I take — viewing, updating, fulfilling, deleting — is recorded in the activity log and reviewed by the main admin.",
    "I will keep donor and patient personal information (phone numbers, addresses) confidential and will not share it outside this platform.",
    "I will not create, modify, or deactivate other admin accounts unless I am authorized as a main admin.",
    "Violating these rules may result in immediate deactivation of my admin account.",
  ],
  bn: [
    "আমি শুধুমাত্র আমার প্রশাসনিক দায়িত্বের জন্য প্রয়োজনীয় তথ্য দেখব, আপডেট করব বা পরিচালনা করব।",
    "মূল অ্যাডমিনের সুস্পষ্ট অনুমতি ছাড়া আমি কোনো ডোনার, রোগী বা রিকোয়েস্টের তথ্য মুছব না। (জেলা অ্যাডমিন কোনো ইউজার অ্যাকাউন্ট মুছতে পারবেন না।)",
    "আমি যদি জেলা অ্যাডমিন হয়ে থাকি, আমি শুধুমাত্র আমার নির্ধারিত জেলার রিকোয়েস্ট, ডোনার ও ইউজার পরিচালনা করব।",
    "আমি জানি আমার প্রতিটি কাজ — দেখা, আপডেট, ফুলফিল, মুছে ফেলা — অ্যাক্টিভিটি লগে সংরক্ষিত হয় এবং মূল অ্যাডমিন তা পর্যালোচনা করেন।",
    "আমি ডোনার ও রোগীর ব্যক্তিগত তথ্য (ফোন নম্বর, ঠিকানা) গোপন রাখব এবং এই প্ল্যাটফর্মের বাইরে শেয়ার করব না।",
    "মূল অ্যাডমিন হিসেবে অনুমোদিত না হলে আমি অন্য কোনো অ্যাডমিন অ্যাকাউন্ট তৈরি, পরিবর্তন বা নিষ্ক্রিয় করব না।",
    "এই নিয়ম লঙ্ঘন করলে আমার অ্যাডমিন অ্যাকাউন্ট অবিলম্বে নিষ্ক্রিয় করা হতে পারে।",
  ],
};

/** Blocking modal: admins must accept the policy & terms once before
 *  using the panel. Acceptance is timestamped on their profile and logged. */
function AdminPolicyGate({ onAccepted }: { onAccepted: () => void }) {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    setSaving(true);
    try {
      await serverAcceptAdminPolicy();
      toast.success(isBn ? "নীতিমালা গৃহীত হয়েছে" : "Policy accepted");
      onAccepted();
    } catch (e: any) {
      toast.error(e.message || "Failed to save acceptance");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 p-6 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <ScrollText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isBn ? "অ্যাডমিন নীতিমালা ও শর্তাবলী" : "Admin Policy & Terms"}
            </h2>
            <p className="text-xs text-slate-500">
              {isBn
                ? "চালিয়ে যেতে আপনাকে অবশ্যই সম্মত হতে হবে"
                : "You must agree before continuing"}
            </p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <ul className="space-y-3">
            {POLICY_RULES[isBn ? "bn" : "en"].map((rule, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>

          <label className="mt-6 flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm font-semibold text-slate-800">
              {isBn
                ? "আমি উপরের সকল নিয়ম ও শর্ত পড়েছি, বুঝেছি এবং সম্মত আছি"
                : "I have read, understood, and agree to all the rules and terms above"}
            </span>
          </label>
        </div>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleAccept}
            disabled={!agreed || saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isBn ? "সম্মত আছি — চালিয়ে যান" : "I Accept — Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [policyChecked, setPolicyChecked] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(true);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Check if on login page — render without chrome
  const cleanPath = pathname.replace(/^\/(en|bn)/, "");
  const isLoginPage = cleanPath.includes("/admin/login");

  useEffect(() => {
    if (isLoginPage) return;
    serverGetMyAdminContext()
      .then((ctx) => {
        setPolicyAccepted(!ctx || ctx.policyAccepted);
        setPolicyChecked(true);
      })
      .catch(() => setPolicyChecked(true));
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="lg:pl-64">
        <AdminHeader onMenuToggle={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {policyChecked && !policyAccepted && (
        <AdminPolicyGate onAccepted={() => setPolicyAccepted(true)} />
      )}
    </div>
  );
}
