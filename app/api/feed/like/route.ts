import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
import { serverToggleLike } from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

const likeSchema = z.object({
  postId: z.number().int().positive(),
});

export const dynamic = "force-dynamic";

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
      "feed-like",
      30,
      5 * 60 * 1000,
      15 * 60 * 1000,
    );

    const body = await req.json();
    const parsed = likeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const postId = parsed.data.postId;
    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const result = await serverToggleLike(postId);

    if (rateKey) await incrementRateLimit(rateKey, 5 * 60 * 1000);

    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed/like]", err);
    return NextResponse.json({ error: err.message || "Failed to toggle like" }, { status: 500 });
  }
}