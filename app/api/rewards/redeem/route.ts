import { NextResponse } from "next/server";
import { serverRedeemReward } from "@/lib/db-actions";

export const dynamic = "force-dynamic";

/** POST /api/rewards/redeem { rewardId } — redeem a reward with points. */
export async function POST(req: Request) {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("rewards-redeem", 10, 60 * 1000, 5 * 60 * 1000);

    const body = await req.json().catch(() => ({}));
    const rewardId = Number(body?.rewardId);
    if (!Number.isFinite(rewardId) || rewardId <= 0) {
      return NextResponse.json({ error: "Valid reward id required" }, { status: 400 });
    }

    const result = await serverRedeemReward(rewardId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const status = /logged in|unauthorized/i.test(err?.message ?? "") ? 401 : 500;
    console.error("[api/rewards/redeem]", err);
    return NextResponse.json({ error: "Failed to redeem reward" }, { status });
  }
}