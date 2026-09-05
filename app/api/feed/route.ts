import { NextResponse } from "next/server";
import {
  serverGetFeed,
  serverCreatePost,
  serverDeletePost,
  serverUpdatePost,
} from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const filter = (url.searchParams.get("filter") || "all") as "all" | "updates" | "requests" | "announcements";

    const feed = await serverGetFeed({ limit, offset, filter });
    return NextResponse.json(feed);
  } catch (err) {
    console.error("[api/feed]", err);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const content = body.content || "";
    const images = Array.isArray(body.images) ? body.images.slice(0, 6) : [];
    const postType = body.postType || "general";
    const relatedRequestId = body.relatedRequestId || null;
    const isPublic = body.isPublic !== false;

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

    return NextResponse.json({ id });
  } catch (err: any) {
    console.error("[api/feed POST]", err);
    return NextResponse.json({ error: err.message || "Failed to create post" }, { status: 500 });
  }
}