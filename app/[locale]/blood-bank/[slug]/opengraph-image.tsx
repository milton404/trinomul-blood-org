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
import { SITE_NAME } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return ALL_AREAS.map((a) => ({ slug: a.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  const meta = area ? getAreaMeta(area, "en") : null;

  return renderOgImage({
    title: meta ? meta.title : "Blood Bank Directory",
    description: meta ? meta.description : undefined,
    badge: area ? `${area.districtNameEn} District` : "Blood Bank",
    siteName: SITE_NAME,
    siteUrl: "trinomul.org",
  });
}