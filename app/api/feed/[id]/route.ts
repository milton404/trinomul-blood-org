import { NextResponse } from "next/server";
import { serverDeletePost, serverUpdatePost } from "@/lib/db-actions";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const postId = parseInt(params.id);
    if (!postId) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const changes = await serverDeletePost(postId);
    return NextResponse.json({ changes });
  } catch (err: any) {
    console.error("[api/feed/[id] DELETE]", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const postId = parseInt(params.id);
    const body = await req.json();

    const changes = await serverUpdatePost(postId, {
      content: body.content,
      images: body.images,
      isPublic: body.isPublic,
    });

    return NextResponse.json({ changes });
  } catch (err: any) {
    console.error("[api/feed/[id] PATCH]", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}