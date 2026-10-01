import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
import {
  getDonorsWithStats,
  createProfile,
  updateProfile,
  getProfileByEmail,
} from "@/lib/db";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { getDonorsWithStatsPg } from "@/lib/db-actions";
import { hashPassword } from "@/lib/auth/password";
import { createDonorSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("donors-list", 30, 60 * 1000, 5 * 60 * 1000);

    const donors = isSupabaseAvailable()
      ? await getDonorsWithStatsPg()
      : getDonorsWithStats();
    return NextResponse.json(donors);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/donors]", err);
    return NextResponse.json(
      { error: "Failed to load donors" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!validateOrigin(req as unknown as NextRequest)) return rejectCsrf();
  try {
    const { enforceRateLimit, incrementRateLimit } = await import(
      "@/lib/auth/rateLimit"
    );
    const rateKey = await enforceRateLimit(
      "create-donor",
      3,
      60 * 60 * 1000,
      60 * 60 * 1000,
    );

    const body = await req.json();

    const parsed = createDonorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const email = parsed.data.email;
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
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
      fullNameEn: parsed.data.fullNameEn || "",
      fullNameBn: parsed.data.fullNameBn || parsed.data.fullNameEn || "",
      phone: parsed.data.phone || "",
      bloodGroup: parsed.data.bloodGroup || "",
      role: "donor",
      district: parsed.data.district || null,
      upazila: parsed.data.upazila || null,
      unionName: null,
      hospitalNameEn: null,
      hospitalNameBn: null,
      licenseNumber: null,
      website: null,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
    });

    updateProfile(id, {
      address: parsed.data.address || null,
      whatsapp_number: parsed.data.whatsappNumber || null,
      sex: parsed.data.sex || null,
      date_of_birth: parsed.data.dateOfBirth || null,
      weight_kg: parsed.data.weightKg || null,
      occupation: parsed.data.occupation || null,
      preferred_contact: parsed.data.preferredContact || "call",
      hb_level: parsed.data.hbLevel || null,
      last_hb_test_date: parsed.data.lastHbTestDate || null,
      last_donation_date: parsed.data.lastDonationDate || null,
      has_chronic_disease: parsed.data.hasChronicDisease ? 1 : 0,
      disease_details: parsed.data.diseaseDetails || null,
      avatar_url: parsed.data.avatarUrl || parsed.data.avatar_url || null,
      is_approved: 0,
      verification_status: "pending",
    });

    if (rateKey) await incrementRateLimit(rateKey, 60 * 60 * 1000);

    return NextResponse.json({ id });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/donors POST]", err);
    return NextResponse.json(
      { error: "Failed to register donor" },
      { status: 500 },
    );
  }
}