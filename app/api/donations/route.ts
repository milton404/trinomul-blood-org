import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { serverGetDonationsByDonorId } from "@/lib/db-actions";

export const dynamic = "force-dynamic";

/**
 * GET /api/donations → donation history of the authenticated donor only.
 * Authorization is enforced by the session: a user can only ever read their
 * own donation records through this endpoint.
 */
export async function GET() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("donations-me", 60, 60 * 1000, 5 * 60 * 1000);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const donations = await serverGetDonationsByDonorId(Number(session.sub));
    return NextResponse.json(donations);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/donations GET]", err);
    return NextResponse.json(
      { error: "Failed to load donations" },
      { status: 500 },
    );
  }
}