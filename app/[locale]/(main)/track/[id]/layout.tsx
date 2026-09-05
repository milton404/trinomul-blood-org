import type { Metadata } from "next";
import {
  serverGetBloodRequestById,
  serverGetBloodRequestByTrackingCode,
} from "@/lib/db-actions";
import { SITE_URL, SITE_NAME, SITE_NAME_BN } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const isBn = locale === "bn";
  const siteName = isBn ? SITE_NAME_BN : SITE_NAME;
  const url = `${SITE_URL}/${locale}/track/${id}`;

  let req: any = null;
  try {
    if (/^\d+$/.test(id)) req = await serverGetBloodRequestById(parseInt(id));
    if (!req) req = await serverGetBloodRequestByTrackingCode(id);
  } catch {}

  if (!req) {
    const title = isBn
      ? "রক্তের অনুরোধ ট্র্যাক করুন"
      : "Track Blood Request";
    const description = isBn
      ? "ট্র্যাকিং কোড বা আইডি দিয়ে রক্তের অনুরোধের অবস্থা দেখুন।"
      : "Track the status of a blood request by tracking code or ID.";
    return {
      title,
      description,
      openGraph: {
        type: "website",
        url,
        siteName,
        title: `${title} | ${siteName}`,
        description,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${siteName}`,
        description,
      },
    };
  }

  const title = isBn
    ? `রক্তের অনুরোধ \u2014 ${req.blood_group ?? ""}`
    : `Blood Request \u2014 ${req.blood_group ?? "Needed"}`;
  const description = isBn
    ? `${req.units_needed ?? 1} ইউনিট প্রয়োজন, ${req.hospital_name ?? ""}${req.district ? ", " + req.district : ""}`
    : `${req.units_needed ?? 1} unit(s) needed at ${req.hospital_name ?? "hospital"}${req.district ? ", " + req.district : ""}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url,
      siteName,
      title: `${title} | ${siteName}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteName}`,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}