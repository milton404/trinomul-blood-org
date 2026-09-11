import {
  renderOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/og-card";
import { serverGetPostById } from "@/lib/db-actions";
import { SITE_NAME, SITE_NAME_BN, SITE_DISPLAY_DOMAIN } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Trinomul Blood Bank — Community Post";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const isBn = locale === "bn";
  let post: any = null;
  try {
    const postId = Number(id);
    if (postId > 0) post = await serverGetPostById(postId);
  } catch {}

  const authorName: string = post?.authorName || post?.author_name || "";
  const rawContent: string = post?.content || post?.body || "";
  const snippet = rawContent.slice(0, 120).trim();

  return renderOgImage({
    title: authorName ? authorName : (isBn ? "কমিউনিটি পোস্ট" : "Community Post"),
    description: snippet || undefined,
    badge: isBn ? "কমিউনিটি" : "Community",
    siteName: isBn ? SITE_NAME_BN : SITE_NAME,
    siteUrl: SITE_DISPLAY_DOMAIN,
  });
}