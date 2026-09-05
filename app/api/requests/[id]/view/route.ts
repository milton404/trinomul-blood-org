import { NextRequest, NextResponse } from "next/server";
import { incrementRequestView } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const changes = incrementRequestView(numericId);
  if (changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}