import { NextResponse } from "next/server";
import { serverAddComment, serverGetComments } from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = parseInt(url.searchParams.get("postId") || "0");
    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const comments = await serverGetComments(postId);
    return NextResponse.json(comments);
  } catch (err) {
    console.error("[api/feed/comment GET]", err);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const postId = parseInt(body.postId);
    const content = (body.content || "").trim();

    if (!postId || !content) {
      return NextResponse.json({ error: "Post ID and content required" }, { status: 400 });
    }

    const id = await serverAddComment(postId, content);
    return NextResponse.json({ id });
  } catch (err: any) {
    console.error("[api/feed/comment POST]", err);
    return NextResponse.json({ error: err.message || "Failed to add comment" }, { status: 500 });
  }
}