import { NextResponse } from "next/server";
import { getTopDonors } from "@/lib/db";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { serverGetTopDonors } from "@/lib/db-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const donors = isSupabaseAvailable()
      ? await serverGetTopDonors(50)
      : getTopDonors(50);
    return NextResponse.json(donors);
  } catch (err) {
    console.error("[api/leaderboard]", err);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}
