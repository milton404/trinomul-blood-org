"use client";

import { useTranslations } from "next-intl";
import DonorApplicationForm from "@/components/forms/DonorApplicationForm";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";

export default function BecomeDonorPage() {
  const t = useTranslations("donor_application");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-red-50 to-white pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-3">{t("page_title")}</h1>
            <p className="text-slate-500 max-w-lg mx-auto">{t("page_subtitle")}</p>
          </div>
          <DonorApplicationForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
