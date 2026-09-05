import { NextResponse } from "next/server";
import {
  getDonorsWithStats,
  createProfile,
  updateProfile,
  getProfileByEmail,
} from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const donors = getDonorsWithStats();
    return NextResponse.json(donors);
  } catch (err) {
    console.error("[api/donors]", err);
    return NextResponse.json(
      { error: "Failed to load donors" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = body.email;
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
      fullNameEn: body.fullNameEn || "",
      fullNameBn: body.fullNameBn || body.fullNameEn || "",
      phone: body.phone || "",
      bloodGroup: body.bloodGroup || "",
      role: "donor",
      district: body.district || null,
      upazila: body.upazila || null,
      unionName: null,
      hospitalNameEn: null,
      hospitalNameBn: null,
      licenseNumber: null,
      website: null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
    });

    updateProfile(id, {
      address: body.address || null,
      whatsapp_number: body.whatsappNumber || null,
      sex: body.sex || null,
      date_of_birth: body.dateOfBirth || null,
      weight_kg: body.weightKg || null,
      occupation: body.occupation || null,
      preferred_contact: body.preferredContact || "call",
      hb_level: body.hbLevel || null,
      last_hb_test_date: body.lastHbTestDate || null,
      last_donation_date: body.lastDonationDate || null,
      has_chronic_disease: body.hasChronicDisease ? 1 : 0,
      disease_details: body.diseaseDetails || null,
      avatar_url: body.avatarUrl || body.avatar_url || null,
      is_approved: 0,
      verification_status: "pending",
    });

    return NextResponse.json({ id });
  } catch (err) {
    console.error("[api/donors POST]", err);
    return NextResponse.json(
      { error: "Failed to register donor" },
      { status: 500 },
    );
  }
}