import { NextResponse } from "next/server";
import { serverDeletePost, serverUpdatePost, serverGetPostById } from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    if (!postId) return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    const post = await serverGetPostById(postId);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (err: any) {
    console.error("[api/feed/[id] GET]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { enforceRateLimit, incrementRateLimit } = await import(
      "@/lib/auth/rateLimit"
    );
    const rateKey = await enforceRateLimit(
      "feed-delete",
      10,
      10 * 60 * 1000,
      30 * 60 * 1000,
    );

    const { id } = await params;
    const postId = parseInt(id);
    if (!postId) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const changes = await serverDeletePost(postId);
    if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);
    return NextResponse.json({ changes });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed/[id] DELETE]", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { enforceRateLimit, incrementRateLimit } = await import(
      "@/lib/auth/rateLimit"
    );
    const rateKey = await enforceRateLimit(
      "feed-update",
      10,
      10 * 60 * 1000,
      30 * 60 * 1000,
    );

    const { id } = await params;
    const postId = parseInt(id);
    const body = await req.json();

    const changes = await serverUpdatePost(postId, {
      content: body.content,
      images: body.images,
      isPublic: body.isPublic,
    });

    if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);
    return NextResponse.json({ changes });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/feed/[id] PATCH]", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}