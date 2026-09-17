import { NextResponse } from "next/server";
import {
  serverGetMyNotifications,
  serverMarkNotificationRead,
  serverMarkAllNotificationsRead,
} from "@/lib/db-actions";

export const dynamic = "force-dynamic";

/**
 * GET  /api/notifications → my in-app notifications
 * POST /api/notifications { id }   → mark one as read
 * PUT  /api/notifications          → mark all as read
 */
export async function GET() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("notifications-get", 60, 60 * 1000, 5 * 60 * 1000);

    const notifications = await serverGetMyNotifications();
    return NextResponse.json(notifications);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const status = /logged in|unauthorized/i.test(err?.message ?? "") ? 401 : 500;
    console.error("[api/notifications GET]", err);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("notifications-mark", 60, 60 * 1000, 5 * 60 * 1000);

    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Valid notification id required" }, { status: 400 });
    }
    await serverMarkNotificationRead(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const status = /logged in|unauthorized/i.test(err?.message ?? "") ? 401 : 500;
    console.error("[api/notifications POST]", err);
    return NextResponse.json({ error: "Failed to mark notification" }, { status });
  }
}

export async function PUT() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("notifications-mark-all", 30, 60 * 1000, 5 * 60 * 1000);

    await serverMarkAllNotificationsRead();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const status = /logged in|unauthorized/i.test(err?.message ?? "") ? 401 : 500;
    console.error("[api/notifications PUT]", err);
    return NextResponse.json({ error: "Failed to mark notifications" }, { status });
  }
}