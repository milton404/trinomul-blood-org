import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
import { serverAddComment, serverGetComments } from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

const commentSchema = z.object({
  postId: z.number().int().positive(),
  content: z.string().min(1).max(5000),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("feed-comment-list", 60, 60 * 1000, 5 * 60 * 1000);

    const url = new URL(req.url);
    const postId = parseInt(url.searchParams.get("postId") || "0");
    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const comments = await serverGetComments(postId);
    return NextResponse.json(comments);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed/comment GET]", err);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!validateOrigin(req as unknown as NextRequest)) return rejectCsrf();
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { enforceRateLimit, incrementRateLimit } = await import(
      "@/lib/auth/rateLimit"
    );
    const rateKey = await enforceRateLimit(
      "feed-comment",
      20,
      10 * 60 * 1000,
      30 * 60 * 1000,
    );

    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const postId = parsed.data.postId;
    const content = (parsed.data.content || "").trim();

    if (!postId || !content) {
      return NextResponse.json({ error: "Post ID and content required" }, { status: 400 });
    }

    const id = await serverAddComment(postId, content);

    if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);

    return NextResponse.json({ id });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed/comment POST]", err);
    return NextResponse.json({ error: err.message || "Failed to add comment" }, { status: 500 });
  }
}