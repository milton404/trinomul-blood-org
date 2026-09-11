import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import {
  ALL_AREAS,
  getAreaBySlug,
  getAreaMeta,
} from "@/lib/seo/area-pages";
import { SITE_NAME, SITE_NAME_BN, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Trinomul Blood Bank — Area Blood Bank Directory";

export function generateStaticParams() {
  return ALL_AREAS.map((a) => ({ slug: a.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isBn = locale === "bn";
  const area = getAreaBySlug(slug);
  const meta = area ? getAreaMeta(area, locale) : null;

  return renderOgImage({
    title: meta ? meta.title : (isBn ? "ব্লাড ব্যাংক ডিরেক্টরি" : "Blood Bank Directory"),
    description: meta ? meta.description : undefined,
    badge: area ? (isBn ? `${area.districtNameBn ?? area.districtNameEn} জেলা` : `${area.districtNameEn} District`) : (isBn ? "ব্লাড ব্যাংক" : "Blood Bank"),
    siteName: isBn ? SITE_NAME_BN : SITE_NAME,
    siteUrl: SITE_DISPLAY_DOMAIN,
  });
}