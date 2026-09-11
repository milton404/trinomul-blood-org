"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import DonorApplicationForm from "@/components/forms/DonorApplicationForm";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import SharePageSection from "@/components/common/SharePageSection";

export default function BecomeDonorPage() {
  const t = useTranslations("donor_application");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-green-100 via-white to-red-100 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Image
              src="/trinomul-logo.png"
              alt="Trinomul Blood Bank"
              width={64}
              height={64}
              className="mx-auto mb-4 w-14 h-14 sm:w-16 sm:h-16 object-contain"
              priority
            />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-3">{t("page_title")}</h1>
            <p className="text-slate-500 max-w-lg mx-auto">{t("page_subtitle")}</p>
          </div>
          <DonorApplicationForm />
          <SharePageSection fileNameBase="become-donor-qr" />
        </div>
      </main>
      <Footer />
    </>
  );
}
