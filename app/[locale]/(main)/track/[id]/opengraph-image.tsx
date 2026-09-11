import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import {
  serverGetBloodRequestById,
  serverGetBloodRequestByTrackingCode,
} from "@/lib/db-actions";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Trinomul Blood Bank — Blood Request Tracking";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  let req: any = null;
  try {
    if (/^\d+$/.test(id)) req = await serverGetBloodRequestById(parseInt(id));
    if (!req) req = await serverGetBloodRequestByTrackingCode(id);
  } catch {}

  const displayDomain = SITE_URL.replace(/^https?:\/\//, "");
  return renderOgImage({
    title: req
      ? `Blood Request \u2014 ${req.blood_group ?? "Needed"}`
      : "Track Blood Request",
    description: req
      ? `${req.units_needed ?? 1} unit(s) needed at ${req.hospital_name ?? "hospital"}${req.district ? ", " + req.district : ""}`
      : "Track the status of a blood request by tracking code or ID.",
    badge: req ? req.urgency_level ?? "Request" : "Tracking",
    siteName: SITE_NAME,
    siteUrl: displayDomain,
  });
}