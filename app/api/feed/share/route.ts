import { NextResponse } from "next/server";
import { serverSharePost } from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { enforceRateLimit, incrementRateLimit } = await import(
      "@/lib/auth/rateLimit"
    );
    const rateKey = await enforceRateLimit(
      "feed-share",
      20,
      10 * 60 * 1000,
      30 * 60 * 1000,
    );

    const body = await req.json();
    const postId = parseInt(body.postId);
    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const result = await serverSharePost(postId);

    if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);

    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed/share]", err);
    return NextResponse.json({ error: err.message || "Failed to share" }, { status: 500 });
  }
}