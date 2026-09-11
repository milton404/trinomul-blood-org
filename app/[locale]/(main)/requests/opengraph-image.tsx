import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import { pageOgCardProps } from "@/lib/seo/pages";
import {
  serverGetBloodRequestById,
  serverGetBloodRequestByTrackingCode,
} from "@/lib/db-actions";
import { SITE_NAME, SITE_NAME_BN, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ req?: string }>;
}) {
  const { locale } = await params;
  const { req: reqCode } = await searchParams;
  const isBn = locale === "bn";

  if (reqCode) {
    try {
      let req: any = null;
      if (/^\d+$/.test(reqCode)) req = await serverGetBloodRequestById(parseInt(reqCode));
      if (!req) req = await serverGetBloodRequestByTrackingCode(reqCode);
      if (req) {
        return renderOgImage({
          title: isBn
            ? `\u09B0\u0995\u09CD\u09A4\u09C7\u09B0 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u2014 ${req.blood_group ?? ""}`
            : `Blood Request \u2014 ${req.blood_group ?? "Needed"}`,
          description: isBn
            ? `${req.units_needed ?? 1} \u0987\u0989\u09A8\u09BF\u099F \u09AA\u09CD\u09B0\u09AF\u09CB\u099C\u09A8, ${req.hospital_name ?? ""}${req.district ? ", " + req.district : ""}`
            : `${req.units_needed ?? 1} unit(s) needed at ${req.hospital_name ?? "hospital"}${req.district ? ", " + req.district : ""}`,
          badge: req.urgency_level ?? (isBn ? "\u0985\u09A8\u09C1\u09B0\u09CB\u09A7" : "Request"),
          siteName: isBn ? SITE_NAME_BN : SITE_NAME,
          siteUrl: SITE_DISPLAY_DOMAIN,
        });
      }
    } catch {}
  }

  return renderOgImage(pageOgCardProps("requests", locale));
}
