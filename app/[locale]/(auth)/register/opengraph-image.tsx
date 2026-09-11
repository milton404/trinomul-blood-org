import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import { SITE_NAME, SITE_NAME_BN, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isBn = locale === "bn";
  return renderOgImage({
    title: isBn ? "\u09B0\u09C7\u099C\u09BF\u09B8\u09CD\u099F\u09BE\u09B0" : "Register",
    description: isBn
      ? "\u09A4\u09C3\u09A3\u09AE\u09C2\u09B2 \u09AC\u09CD\u09B2\u09BE\u09A1 \u09AC\u09CD\u09AF\u09BE\u0982\u0995\u09C7 \u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09A8 \u0995\u09B0\u09C1\u09A8\u0964"
      : "Create a Trinomul Blood Bank account.",
    badge: isBn ? "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F" : "Account",
    siteName: isBn ? SITE_NAME_BN : SITE_NAME,
    siteUrl: SITE_DISPLAY_DOMAIN,
  });
}