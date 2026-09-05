import { NextResponse } from "next/server";
import { serverLogin } from "@/lib/auth/actions";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { getProfileByEmail, createProfile, updateProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, identifier } = body;

    // Login path
    if (identifier || email) {
      const loginId = identifier || email;
      const pwd = password;
      if (!pwd) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      try {
        // serverLogin handles verification + sets session cookie
        const result = await serverLogin(loginId, pwd, false);
        return NextResponse.json({ user: result.user });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Login failed" }, { status: 401 });
      }
    }

    // Signup path (create new donor account via mobile)
    const { fullNameEn, fullNameBn, phone, bloodGroup } = body;
    if (!email || !fullNameEn || !phone) {
      return NextResponse.json(
        { error: "Email, name, and phone are required" },
        { status: 400 },
      );
    }

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
    const { randomBytes: rb2 } = await import("crypto");
    const tempPassword = rb2(16).toString("hex");
    // Set a session for the new user
    await createSession({ sub: String(id), email, role: "donor" }, false);

    return NextResponse.json({
      user: {
        id,
        email,
        role: "donor",
        full_name_en: fullNameEn,
        full_name_bn: fullNameBn || null,
      },
    });
  } catch (err) {
    console.error("[api/auth/login]", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}