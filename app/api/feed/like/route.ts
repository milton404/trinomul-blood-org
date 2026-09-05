import { NextResponse } from "next/server";
import { serverToggleLike } from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const postId = parseInt(body.postId);
    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const result = await serverToggleLike(postId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/feed/like]", err);
    return NextResponse.json({ error: err.message || "Failed to toggle like" }, { status: 500 });
  }
}