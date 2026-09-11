import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import { getSeoTexts, SITE_NAME, SITE_NAME_BN, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${SITE_NAME} — Find Blood Donors & Request Blood`;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isBn = locale === "bn";
  const t = getSeoTexts(locale);
  return renderOgImage({
    title: isBn ? "রক্তদাতা খুঁজুন ও রক্তের অনুরোধ করুন" : "Find Blood Donors & Request Blood",
    description: t.ogDescription,
    badge: isBn ? "রংপুর বিভাগ, বাংলাদেশ" : "Rangpur Division, Bangladesh",
    siteName: isBn ? SITE_NAME_BN : SITE_NAME,
    siteUrl: SITE_DISPLAY_DOMAIN,
  });
}