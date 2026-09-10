import { NextResponse } from "next/server";
import { getTopDonors } from "@/lib/db";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { serverGetTopDonors } from "@/lib/db-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("leaderboard", 30, 60 * 1000, 5 * 60 * 1000);

    const donors = isSupabaseAvailable()
      ? await serverGetTopDonors(50)
      : getTopDonors(50);
    return NextResponse.json(donors);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/leaderboard]", err);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}
