import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("auth-logout", 10, 5 * 60 * 1000, 15 * 60 * 1000);

    await destroySession();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return NextResponse.json({ success: false }, { status: 500 });
  }
}