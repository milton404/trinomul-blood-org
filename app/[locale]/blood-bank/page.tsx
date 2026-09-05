import type { Metadata } from "next";
import {
  getRangpurSadarWithUnions,
  getPaglapirAreas,
  getAreasGroupedByDistrict,
} from "@/lib/seo/area-pages";
import { SITE_URL, SITE_NAME, LOGO_URL } from "@/lib/seo";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isBn = locale === "bn";
  const title = isBn
    ? "রংপুর বিভাগের ব্লাড ব্যাংক — সব উপজেলা ও ইউনিয়ন"
    : "Blood Banks in Rangpur Division — All Upazilas & Unions";
  const description = isBn
    ? "রংপুর বিভাগের ৮ জেলার প্রতিটি উপজেলা ও রংপুর সদর ইউনিয়নে রক্তদাতা ও ব্লাড ব্যাংক খুঁজুন। রক্তদান করুন, জরুরি রক্তের অনুরোধ করুন।"
    : "Find blood donors and blood banks in every upazila of Rangpur division's 8 districts, plus Rangpur Sadar unions. Donate blood and request emergency blood.";

  const url = `${SITE_URL}/${locale}/blood-bank`;

  return {
    title,
    description,
    keywords: [
      "blood bank rangpur division",
      "upazila blood bank",
      "রংপুর বিভাগ ব্লাড ব্যাংক",
      "উপজেলা রক্তদাতা",
      "blood donor upazila",
    ],
    alternates: {
      canonical: url,
      languages: {
        en: `${SITE_URL}/en/blood-bank`,
        bn: `${SITE_URL}/bn/blood-bank`,
        "x-default": `${SITE_URL}/bn/blood-bank`,
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: LOGO_URL, width: 512, height: 512, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [LOGO_URL],
    },
  };
}

export default async function BloodBankHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isBn = locale === "bn";

  const sadarGroup = getRangpurSadarWithUnions();
  const paglapirAreas = getPaglapirAreas();
  const districts = getAreasGroupedByDistrict();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10 md:py-14">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
          {isBn ? "রংপুর বিভাগের ব্লাড ব্যাংক" : "Blood Banks in Rangpur Division"}
        </h1>
        <p className="mt-3 text-slate-600 max-w-3xl">
          {isBn
            ? "প্রতিটি উপজেলা ও ইউনিয়নে রক্তদাতা, রক্তের গ্রুপ ও জরুরি রক্তের ব্যবস্থা দেখুন।"
            : "Browse blood donors, blood groups and emergency blood support in every upazila and union."}
        </p>

        {/* Rangpur Sadar + unions — top priority */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {isBn ? "রংপুর সদর ও ইউনিয়নসমূহ" : "Rangpur Sadar & Unions"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sadarGroup.map((a) => (
              <a
                key={a.slug}
                href={`/${locale}/blood-bank/${a.slug}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-red-600 hover:shadow-sm transition-all"
              >
                <span className="font-semibold text-slate-900 block">
                  {isBn ? a.nameBn : a.nameEn}
                </span>
                <span className="text-xs text-slate-500">
                  {a.kind === "union"
                    ? isBn ? "ইউনিয়ন ব্লাড ব্যাংক" : "Union Blood Bank"
                    : a.kind === "bazar"
                      ? isBn ? "বাজার ব্লাড ব্যাংক" : "Bazar Blood Bank"
                      : isBn ? "ব্লাড ব্যাংক" : "Blood Bank"}
                </span>
                <span className="text-xs text-slate-400 block">{a.banglish} Blood Bank</span>
              </a>
            ))}
          </div>
        </section>

        {/* Paglapir + Paglapir Bazar — right after Sadar priority */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {isBn ? "পাগলাপীর ও পাগলাপীর বাজার" : "Paglapir & Paglapir Bazar"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paglapirAreas.map((a) => (
              <a
                key={a.slug}
                href={`/${locale}/blood-bank/${a.slug}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-red-600 hover:shadow-sm transition-all"
              >
                <span className="font-semibold text-slate-900 block">
                  {isBn ? a.nameBn : a.nameEn}
                </span>
                <span className="text-xs text-slate-500">
                  {a.kind === "bazar"
                    ? isBn ? "বাজার ব্লাড ব্যাংক" : "Bazar Blood Bank"
                    : isBn ? "ব্লাড ব্যাংক" : "Blood Bank"}
                </span>
                <span className="text-xs text-slate-400 block">{a.banglish} Blood Bank</span>
              </a>
            ))}
          </div>
        </section>

        {/* All upazilas grouped by district */}
        {districts.map((district) => (
          <section key={district.districtId} className="mt-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {isBn ? `${district.nameBn} জেলা` : `${district.nameEn} District`}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {district.areas.map((a) => (
                <a
                  key={a.slug}
                  href={`/${locale}/blood-bank/${a.slug}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-red-600 hover:shadow-sm transition-all"
                >
                  <span className="font-semibold text-slate-900 block">
                    {isBn ? a.nameBn : a.nameEn}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isBn ? "ব্লাড ব্যাংক" : "Blood Bank"}
                  </span>
                  <span className="text-xs text-slate-400 block">{a.banglish} Blood Bank</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}