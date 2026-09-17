import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getProfileByEmail } from "@/lib/db";
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";
import { serverUpdateProfile } from "@/lib/db-actions";

export const dynamic = "force-dynamic";

/**
 * GET  /api/profile → the authenticated user's full profile (Bearer token or session cookie)
 * PATCH /api/profile → update the authenticated user's own profile
 *   (allow-listed fields; protected fields are stripped server-side by serverUpdateProfile)
 */

const PATCH_ALLOWED_FIELDS = [
  "full_name_en",
  "full_name_bn",
  "phone",
  "whatsapp_number",
  "preferred_contact",
  "blood_group",
  "district",
  "upazila",
  "union_name",
  "address",
  "is_active",
  "avatar_url",
] as const;

async function loadProfile(email: string) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      "SELECT * FROM profiles WHERE email = $1",
      [email],
    );
    return (rows[0] ?? null) as Record<string, unknown> | null;
  }
  return (getProfileByEmail(email) ?? null) as Record<string, unknown> | null;
}

export async function GET() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("profile-get", 60, 60 * 1000, 5 * 60 * 1000);

    const session = await getSession();
    if (!session) return NextResponse.json({ user: null });

    const profile = await loadProfile(session.email);
    if (!profile) return NextResponse.json({ user: null });

    return NextResponse.json({ user: profile });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/profile GET]", err);
    return NextResponse.json({ user: null });
  }
}

export async function PATCH(req: Request) {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("profile-update", 20, 60 * 1000, 5 * 60 * 1000);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    for (const field of PATCH_ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await serverUpdateProfile(Number(session.sub), data);

    const profile = await loadProfile(session.email);
    return NextResponse.json({ user: profile });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const status = err?.message === "Unauthorized" ? 401 : 400;
    console.error("[api/profile PATCH]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update profile" },
      { status },
    );
  }
}