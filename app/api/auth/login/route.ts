import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
import { serverLogin } from "@/lib/auth/actions";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getProfileByEmail, createProfile, updateProfile } from "@/lib/db";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1).optional(),
  identifier: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  fullNameEn: z.string().optional(),
  fullNameBn: z.string().optional(),
  phone: z.string().optional(),
  bloodGroup: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!validateOrigin(req as unknown as NextRequest)) return rejectCsrf();
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { email, password, identifier } = parsed.data;

    // Login path
    if (identifier || email) {
      const loginId = identifier || email || "";
      const pwd = password;
      if (!pwd) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      // serverLogin returns a result union (never throws) so specific error
      // messages (wrong password, rate limit) survive to the client.
      const result = await serverLogin(loginId, pwd, false);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      return NextResponse.json({ user: result.user, token: result.token });
    }

    // Signup path (create new donor account via mobile)
    const { fullNameEn, fullNameBn, phone, bloodGroup } = parsed.data;
    if (!email || !fullNameEn || !phone) {
      return NextResponse.json(
        { error: "Email, name, and phone are required" },
        { status: 400 },
      );
    }

    const { enforceRateLimit, incrementRateLimit } = await import(
      "@/lib/auth/rateLimit"
    );
    const signupRateKey = await enforceRateLimit(
      `signup:${email.toLowerCase()}`,
      5,
      60 * 60 * 1000,
      60 * 60 * 1000,
    );

    const existing = getProfileByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const { randomBytes } = await import("crypto");
    const randomPassword = randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(randomPassword);

    const id = createProfile({
      email,
      passwordHash,
      fullNameEn,
      fullNameBn: fullNameBn || fullNameEn,
      phone,
      bloodGroup: bloodGroup || "",
      role: "donor",
      district: null,
      upazila: null,
      unionName: null,
      hospitalNameEn: null,
      hospitalNameBn: null,
      licenseNumber: null,
      website: null,
      lat: null,
      lng: null,
    });

    updateProfile(id, {
      is_approved: 0,
      verification_status: "pending",
    });

    // Auto-login after signup
    // Set a session for the new user
    const token = await createSession({ sub: String(id), email, role: "donor" }, false);

    if (signupRateKey) await incrementRateLimit(signupRateKey, 60 * 60 * 1000);

    return NextResponse.json({
      user: {
        id,
        email,
        role: "donor",
        full_name_en: fullNameEn,
        full_name_bn: fullNameBn || null,
      },
      token,
    });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/auth/login]", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}