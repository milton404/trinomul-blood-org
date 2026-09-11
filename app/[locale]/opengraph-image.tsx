import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import { getSeoTexts, SITE_NAME, SITE_URL } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${SITE_NAME} — Find Blood Donors & Request Blood`;

export default async function Image() {
  const t = getSeoTexts("en");
  const displayDomain = SITE_URL.replace(/^https?:\/\//, "");
  return renderOgImage({
    title: "Find Blood Donors & Request Blood",
    description: t.ogDescription,
    badge: "Rangpur Division, Bangladesh",
    siteName: SITE_NAME,
    siteUrl: displayDomain,
  });
}