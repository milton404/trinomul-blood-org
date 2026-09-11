import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import {
  serverGetBloodRequestById,
  serverGetBloodRequestByTrackingCode,
} from "@/lib/db-actions";
import { SITE_NAME, SITE_NAME_BN, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Trinomul Blood Bank — Blood Request Tracking";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const isBn = locale === "bn";
  let req: any = null;
  try {
    if (/^\d+$/.test(id)) req = await serverGetBloodRequestById(parseInt(id));
    if (!req) req = await serverGetBloodRequestByTrackingCode(id);
  } catch {}

  return renderOgImage({
    title: req
      ? isBn
        ? `রক্তের অনুরোধ \u2014 ${req.blood_group ?? ""}`
        : `Blood Request \u2014 ${req.blood_group ?? "Needed"}`
      : isBn
        ? "রক্তের অনুরোধ ট্র্যাক করুন"
        : "Track Blood Request",
    description: req
      ? isBn
        ? `${req.units_needed ?? 1} ইউনিট প্রয়োজন, ${req.hospital_name ?? ""}${req.district ? ", " + req.district : ""}`
        : `${req.units_needed ?? 1} unit(s) needed at ${req.hospital_name ?? "hospital"}${req.district ? ", " + req.district : ""}`
      : isBn
        ? "ট্র্যাকিং কোড বা আইডি দিয়ে রক্তের অনুরোধের অবস্থা দেখুন।"
        : "Track the status of a blood request by tracking code or ID.",
    badge: req ? req.urgency_level ?? (isBn ? "অনুরোধ" : "Request") : (isBn ? "ট্র্যাকিং" : "Tracking"),
    siteName: isBn ? SITE_NAME_BN : SITE_NAME,
    siteUrl: SITE_DISPLAY_DOMAIN,
  });
}