"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import Navbar from "@/components/common/Navbar";
import FeedPostCard from "@/components/social/FeedPostCard";
import { BloodDropLoading } from "@/components/ui/BloodDropLoading";
import { serverGetPostById, serverGetStories } from "@/lib/db-actions";
import { useAuthStore } from "@/store/authStore";

export default function SinglePostPage() {
  const t = useTranslations("social");
  const params = useParams<{ id: string }>();
  const postId = Number(params?.id);
  const { user, role } = useAuthStore();
  const currentUser = user ? { id: Number(user.id), role: user.role || role || "" } : null;
  const isAdmin = role === "admin" || role === "super_admin";

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [storyAuthorIds, setStoryAuthorIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    serverGetPostById(postId)
      .then((p) => {
        if (!p) setNotFound(true);
        else setPost(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    serverGetStories()
      .then((rows: any) => {
        const ids = new Set<number>();
        for (const r of rows || []) ids.add(Number(r.author_id));
        setStoryAuthorIds(ids);
      })
      .catch(() => {});
  }, [postId]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 sm:bg-white">
        <div className="mx-auto w-full max-w-[680px]">
          <div className="sticky top-[56px] md:top-[60px] z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/feed"
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                aria-label="Back to feed"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <p className="text-[15px] font-black tracking-tight text-slate-900">
                {t("community")}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <BloodDropLoading />
            </div>
          ) : notFound ? (
            <div className="bg-white border border-slate-100 sm:shadow-sm rounded-2xl p-10 text-center text-slate-400 text-sm mt-4 mx-3">
              {t("noPosts")}
            </div>
          ) : post ? (
            <FeedPostCard
              post={post}
              currentUser={currentUser}
              isAdmin={isAdmin}
              authorHasStory={storyAuthorIds.has(Number(post.authorId))}
              onDeleted={() => setNotFound(true)}
              onChanged={() => serverGetPostById(postId).then((p) => p && setPost(p))}
            />
          ) : null}
        </div>
      </main>
    </>
  );
}