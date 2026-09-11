import type { Metadata } from "next";
import { serverGetPostById } from "@/lib/db-actions";
import { SITE_URL, SITE_NAME, SITE_NAME_BN } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const isBn = locale === "bn";
  const siteName = isBn ? SITE_NAME_BN : SITE_NAME;
  const url = `${SITE_URL}/${locale}/feed/${id}`;

  let post: any = null;
  try {
    const postId = Number(id);
    if (postId > 0) post = await serverGetPostById(postId);
  } catch {}

  if (!post) {
    const title = isBn ? "কমিউনিটি পোস্ট" : "Community Post";
    const description = isBn
      ? "তৃণমূল ব্লাড ব্যাংক কমিউনিটি ফিডের একটি পোস্ট।"
      : "A post from the Trinomul Blood Bank community feed.";
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
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

  const rawContent: string = post.content || post.body || "";
  const snippet = rawContent.slice(0, 160).trim();
  const authorName: string = post.authorName || post.author_name || "";
  const title = isBn
    ? `${authorName ? authorName + " — " : ""}কমিউনিটি পোস্ট`
    : `${authorName ? authorName + " — " : ""}Community Post`;
  const description = snippet || (isBn
    ? "তৃণমূল ব্লাড ব্যাংক কমিউনিটি ফিডের একটি পোস্ট।"
    : "A post from the Trinomul Blood Bank community feed.");

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName,
      title: `${title} | ${siteName}`,
      description,
      ...(post.imageUrl || post.image_url
        ? { images: [{ url: post.imageUrl || post.image_url }] }
        : {}),
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