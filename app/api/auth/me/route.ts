import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getProfileByEmail } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const profile = getProfileByEmail(session.email);
    if (!profile) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name_en: profile.full_name_en,
        full_name_bn: profile.full_name_bn,
        phone: profile.phone,
        blood_group: profile.blood_group,
        role: profile.role,
        district: profile.district,
        upazila: profile.upazila,
        address: profile.address,
        date_of_birth: profile.date_of_birth,
        sex: profile.sex,
        weight_kg: profile.weight_kg,
        occupation: profile.occupation,
        preferred_contact: profile.preferred_contact,
        is_active: profile.is_active,
        is_verified: profile.is_verified,
        verification_status: profile.verification_status,
        hb_level: profile.hb_level,
        last_hb_test_date: profile.last_hb_test_date,
        last_donation_date: profile.last_donation_date,
        has_chronic_disease: profile.has_chronic_disease,
        disease_details: profile.disease_details,
        created_at: profile.created_at,
        last_login_at: profile.last_login_at,
        last_active_at: profile.last_active_at,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}