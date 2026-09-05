import { NextResponse } from "next/server";
import { getTopDonors } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const donors = getTopDonors(50);
    return NextResponse.json(donors);
  } catch (err) {
    console.error("[api/leaderboard]", err);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}