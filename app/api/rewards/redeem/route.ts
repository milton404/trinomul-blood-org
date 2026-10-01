import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
import { serverRedeemReward } from "@/lib/db-actions";
import { z } from "zod";

const redeemSchema = z.object({
  rewardId: z.number().int().positive(),
});

export const dynamic = "force-dynamic";

/** POST /api/rewards/redeem { rewardId } — redeem a reward with points. */
export async function POST(req: Request) {
  if (!validateOrigin(req as unknown as NextRequest)) return rejectCsrf();
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("rewards-redeem", 10, 60 * 1000, 5 * 60 * 1000);

    const body = await req.json().catch(() => ({}));
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const rewardId = parsed.data.rewardId;
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