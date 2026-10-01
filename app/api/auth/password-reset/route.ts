import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
import { serverRequestPasswordReset, serverResetPassword } from "@/lib/auth/actions";
import { z } from "zod";

const passwordResetRequestSchema = z.object({
  identifier: z.string().min(1),
});

const passwordResetCompleteSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export const dynamic = "force-dynamic";

/**
 * Mobile/client REST wrapper around the existing password-reset server actions.
 * POST /api/auth/password-reset   { identifier }  → sends reset email (never reveals account existence)
 * PUT  /api/auth/password-reset   { token, newPassword } → completes the reset
 */

export async function POST(req: Request) {
  if (!validateOrigin(req as unknown as NextRequest)) return rejectCsrf();
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit(
      "password-reset-request",
      5,
      60 * 60 * 1000,
      60 * 60 * 1000,
    );

    const body = await req.json().catch(() => ({}));
    const parsed = passwordResetRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const identifier = String(parsed.data.identifier ?? "").trim();
    if (!identifier) {
      return NextResponse.json(
        { error: "Email or phone is required" },
        { status: 400 },
      );
    }

    const result = await serverRequestPasswordReset(identifier);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    // Never reveal whether the account exists. In non-production only, the
    // token is returned so the mobile/dev flow can finish a reset when email
    // delivery is not configured.
    const payload: Record<string, unknown> = { sent: true };
    if (process.env.NODE_ENV !== "production" && result.token) {
      payload.devToken = result.token;
    }
    return NextResponse.json(payload);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/auth/password-reset POST]", err);
    return NextResponse.json(
      { error: "Failed to send reset instructions" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  if (!validateOrigin(req as unknown as NextRequest)) return rejectCsrf();
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit(
      "password-reset-complete",
      10,
      60 * 60 * 1000,
      60 * 60 * 1000,
    );

    const body = await req.json().catch(() => ({}));
    const parsed = passwordResetCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const token = String(parsed.data.token ?? "").trim();
    const newPassword = String(parsed.data.newPassword ?? "");
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Reset token and new password are required" },
        { status: 400 },
      );
    }

    const result = await serverResetPassword(token, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    return NextResponse.json(
      { error: err?.message || "Failed to reset password" },
      { status: 400 },
    );
  }
}