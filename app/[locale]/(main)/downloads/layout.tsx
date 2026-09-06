import type { Metadata } from "next";
import { getSeoTexts, SITE_URL } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getSeoTexts(locale);
  const isBn = locale === "bn";

  return {
    title: isBn ? "অ্যাপ ডাউনলোড" : "Download App",
    description: isBn
      ? "তৃণমূল ব্লাড ব্যাংক অ্যাপ ডাউনলোড করুন — iOS, Android, Windows, Mac। কোনো অ্যাপ স্টোর লাগবে না।"
      : "Download Trinomul Blood Bank app — iOS, Android, Windows, Mac. No app store needed, install directly from browser.",
    openGraph: {
      title: isBn ? "তৃণমূল ব্লাড ব্যাংক অ্যাপ ডাউনলোড" : "Download Trinomul Blood Bank App",
      description: isBn
        ? "যেকোনো ডিভাইসে ইনস্টল করুন — কোনো অ্যাপ স্টোর লাগবে না।"
        : "Install on any device — no app store needed.",
      url: `${SITE_URL}/${locale}/downloads`,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: t.title }],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/og-image.png"],
    },
  };
}

export default function DownloadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
