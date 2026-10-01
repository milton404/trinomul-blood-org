import { NextRequest, NextResponse } from "next/server";
import { incrementRequestView } from "@/lib/db";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { incrementRequestViewPg } from "@/lib/pg/requests";
import { checkRateLimit, incrementRateLimit } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateKey = `view:${ip}`;
  const limit = await checkRateLimit(rateKey, 60, 60 * 1000, 2 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const changes = isSupabaseAvailable()
    ? await incrementRequestViewPg(numericId)
    : incrementRequestView(numericId);
  if (changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await incrementRateLimit(rateKey, 60 * 1000);
  return NextResponse.json({ ok: true });
}
