import { NextResponse } from "next/server";
import { getBloodRequestById } from "@/lib/db";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { getBloodRequestByIdPg } from "@/lib/pg/requests";

export const dynamic = "force-dynamic";

/** GET /api/requests/[id] → full blood request record by id */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("request-get", 60, 60 * 1000, 5 * 60 * 1000);

    const { id } = await params;
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const request = isSupabaseAvailable()
      ? await getBloodRequestByIdPg(numericId)
      : getBloodRequestById(numericId);

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return NextResponse.json(request);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/requests/[id]]", err);
    return NextResponse.json({ error: "Failed to load request" }, { status: 500 });
  }
}