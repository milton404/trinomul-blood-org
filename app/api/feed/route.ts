import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
import {
  serverGetFeed,
  serverCreatePost,
  serverDeletePost,
  serverUpdatePost,
} from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";
import { createPostSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("feed-list", 60, 60 * 1000, 5 * 60 * 1000);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const filter = (url.searchParams.get("filter") || "all") as "all" | "updates" | "requests" | "announcements";

    const feed = await serverGetFeed({ limit, offset, filter });
    return NextResponse.json(feed);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed]", err);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
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
      "feed-post",
      10,
      10 * 60 * 1000,
      30 * 60 * 1000,
    );

    const body = await req.json();

    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const content = parsed.data.content || "";
    const images = parsed.data.images.slice(0, 6);
    const postType = parsed.data.postType || "general";
    const relatedRequestId = parsed.data.relatedRequestId || null;
    const isPublic = parsed.data.isPublic !== false;

    if (!content.trim() && images.length === 0) {
      return NextResponse.json({ error: "Post cannot be empty" }, { status: 400 });
    }

    const id = await serverCreatePost({
      content,
      images,
      postType,
      relatedRequestId,
      isPublic,
    });

    if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);

    return NextResponse.json({ id });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed POST]", err);
    return NextResponse.json({ error: err.message || "Failed to create post" }, { status: 500 });
  }
}