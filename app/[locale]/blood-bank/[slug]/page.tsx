import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ALL_AREAS,
  getAreaBySlug,
  getAreaMeta,
} from "@/lib/seo/area-pages";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function generateStaticParams() {
  return ALL_AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) return {};

  const meta = getAreaMeta(area, locale);
  const url = `${SITE_URL}/${locale}/blood-bank/${slug}`;
  const alternate = (l: string) => `${SITE_URL}/${l}/blood-bank/${slug}`;

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: url,
      languages: {
        en: alternate("en"),
        bn: alternate("bn"),
        "x-default": alternate("bn"),
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.description,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();

  const isBn = locale === "bn";
  const meta = getAreaMeta(area, locale);
  const title = isBn ? area.nameBn : area.nameEn;

  const donorHref = area.kind === "upazila"
    ? `/${locale}/donors?upazila=${area.id}`
    : `/${locale}/donors?upazila=${area.upazilaId}`;

  const siblings = ALL_AREAS.filter((a) => {
    if (a.id === area.id) return false;
    if (area.kind === "union" || area.kind === "bazar") {
      if (a.kind === "upazila") return a.id === area.upazilaId;
      if (a.kind === "union") return a.upazilaId === area.upazilaId;
      return false;
    }
    return a.kind === "upazila" && a.districtId === area.districtId;
  });

  const faqs = isBn
    ? [
        {
          q: `${title} এলাকায় রক্তদাতা কীভাবে খুঁজব?`,
          a: `তৃণমূল ব্লাড ব্যাংক রংপুরে ${title} এলাকা নির্বাচন করে রক্তের গ্রুপ দিয়ে সার্চ করুন। যাচাইকৃত রক্তদাতাদের ফোন নম্বর, রক্তের গ্রুপ ও দূরত্ব দেখে সরাসরি যোগাযোগ করুন।`,
        },
        {
          q: `${title} এলাকায় জরুরি রক্ত কীভাবে চাইব?`,
          a: `জরুরি রক্তের অনুরোধ ফর্ম পূরণ করুন। আপনার অনুরোধ ${title} ও আশপাশের এলাকার রক্তদাতাদের কাছে পৌঁছে যাবে এবং তারা সরাসরি সাহায্য করবেন।`,
        },
        {
          q: `কোন কোন রক্তের গ্রুপ পাওয়া যায়?`,
          a: `A+, A-, B+, B-, AB+, AB-, O+ ও O- — সব গ্রুপের রক্তদাতা ${title} এলাকায় তালিকাভুক্ত আছেন। বিরল গ্রুপের জন্যও সার্চ করতে পারবেন।`,
        },
      ]
    : [
        {
          q: `How do I find blood donors in ${title}?`,
          a: `Select ${title} on Trinomul Blood Bank Rangpur and search by blood group. You will see verified donors with phone numbers, blood group and distance, so you can contact them directly.`,
        },
        {
          q: `How do I request emergency blood in ${title}?`,
          a: `Fill in the emergency blood request form. Your request reaches donors in ${title} and nearby areas, and they can contact you directly to help.`,
        },
        {
          q: `Which blood groups are available?`,
          a: `All groups are listed in ${title}: A+, A-, B+, B-, AB+, AB-, O+ and O-. You can also search for rare blood groups.`,
        },
      ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbItems = [
    { name: isBn ? "হোম" : "Home", url: `${SITE_URL}/${locale}` },
    { name: isBn ? "ব্লাড ব্যাংক" : "Blood Bank", url: `${SITE_URL}/${locale}/blood-bank` },
  ];
  if (area.kind === "union" && area.upazilaNameEn && area.upazilaId) {
    breadcrumbItems.push({
      name: isBn ? area.upazilaNameBn! : area.upazilaNameEn,
      url: `${SITE_URL}/${locale}/blood-bank/${area.upazilaId.replace(/_/g, "-")}`,
    });
  }
  breadcrumbItems.push({ name: title, url: `${SITE_URL}/${locale}/blood-bank/${slug}` });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10 md:py-14">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <nav className="text-sm text-slate-500 mb-4">
          <a href={`/${locale}/blood-bank`} className="hover:text-red-600">
            {isBn ? "ব্লাড ব্যাংক" : "Blood Bank"}
          </a>
          <span className="mx-2">/</span>
          <span className="text-slate-700">{title}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            {meta.h1}
          </h1>
          <p className="mt-3 text-slate-600">
            {isBn
              ? `বাংলা: ${area.nameBn} · English: ${area.nameEn} · Banglish: ${area.banglish}`
              : `English: ${area.nameEn} · বাংলা: ${area.nameBn} · Banglish: ${area.banglish}`}
          </p>
          {(area.kind === "union" || area.kind === "bazar") && area.upazilaNameEn && (
            <p className="mt-2 text-sm text-slate-500">
              {isBn
                ? `উপজেলা: ${area.upazilaNameBn} · জেলা: ${area.districtNameBn} · রংপুর বিভাগ`
                : `Upazila: ${area.upazilaNameEn} · District: ${area.districtNameEn} · Rangpur Division`}
            </p>
          )}
          {area.kind === "upazila" && (
            <p className="mt-2 text-sm text-slate-500">
              {isBn
                ? `জেলা: ${area.districtNameBn} · রংপুর বিভাগ`
                : `District: ${area.districtNameEn} · Rangpur Division`}
            </p>
          )}
        </header>

        <p className="text-lg text-slate-700 leading-relaxed max-w-3xl">
          {meta.description}
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3">
            {isBn ? "রক্তের গ্রুপসমূহ" : "Available Blood Groups"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((g) => (
              <span
                key={g}
                className="inline-flex items-center px-4 py-2 rounded-full bg-red-600 text-white font-semibold text-sm"
              >
                {g}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-8 flex flex-wrap gap-3">
          <a
            href={donorHref}
            className="inline-flex items-center px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
          >
            {isBn ? "রক্তদাতা খুঁজুন" : "Find Donors"}
          </a>
          <a
            href={`/${locale}/request`}
            className="inline-flex items-center px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold transition-colors"
          >
            {isBn ? "রক্তের অনুরোধ করুন" : "Request Blood"}
          </a>
          <a
            href={`/${locale}/become-donor`}
            className="inline-flex items-center px-5 py-3 rounded-xl bg-white border border-slate-300 hover:border-red-600 hover:text-red-600 text-slate-800 font-semibold transition-colors"
          >
            {isBn ? "রক্তদাতা হোন" : "Become a Donor"}
          </a>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {isBn ? "সাধারণ প্রশ্ন" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.q} className="bg-white rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-slate-900">{f.q}</h3>
                <p className="mt-1 text-slate-600 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {siblings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {isBn ? "আরও এলাকা" : "More Areas"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {siblings.map((s) => (
                <a
                  key={s.slug}
                  href={`/${locale}/blood-bank/${s.slug}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-red-600 transition-colors"
                >
                  <span className="font-semibold text-slate-900 block">
                    {isBn ? s.nameBn : s.nameEn}
                  </span>
                  <span className="text-xs text-slate-500">
                    {s.kind === "union"
                      ? isBn ? "ইউনিয়ন ব্লাড ব্যাংক" : "Union Blood Bank"
                      : s.kind === "bazar"
                        ? isBn ? "বাজার ব্লাড ব্যাংক" : "Bazar Blood Bank"
                        : isBn ? "ব্লাড ব্যাংক" : "Blood Bank"}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}