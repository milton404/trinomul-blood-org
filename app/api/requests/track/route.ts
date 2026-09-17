import { NextResponse } from "next/server";
import { getBloodRequestByTrackingCode } from "@/lib/db";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { getBloodRequestByTrackingCodePg } from "@/lib/pg/requests";

export const dynamic = "force-dynamic";

/** GET /api/requests/track?code=TRB-XXXXXX → look up a request by its tracking code */
export async function GET(req: Request) {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("request-track", 30, 60 * 1000, 5 * 60 * 1000);

    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Tracking code is required" }, { status: 400 });
    }

    const request = isSupabaseAvailable()
      ? await getBloodRequestByTrackingCodePg(code)
      : getBloodRequestByTrackingCode(code);

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return NextResponse.json(request);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/requests/track]", err);
    return NextResponse.json({ error: "Failed to track request" }, { status: 500 });
  }
}