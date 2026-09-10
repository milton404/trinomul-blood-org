import { NextResponse } from "next/server";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import {
  getVisibleBloodRequests,
  createBloodRequest,
  getBloodRequestById,
} from "@/lib/db";
import {
  getVisibleBloodRequestsPg,
  createBloodRequestPg,
  getBloodRequestByIdPg,
} from "@/lib/pg/requests";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("requests-list", 60, 60 * 1000, 5 * 60 * 1000);

    const requests = isSupabaseAvailable()
      ? await getVisibleBloodRequestsPg()
      : getVisibleBloodRequests();
    return NextResponse.json(requests);
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/requests]", err);
    return NextResponse.json(
      { error: "Failed to load requests" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { enforceRateLimit, incrementRateLimit } = await import(
      "@/lib/auth/rateLimit"
    );
    const rateKey = await enforceRateLimit(
      "create-request",
      5,
      15 * 60 * 1000,
      30 * 60 * 1000,
    );

    const body = await req.json();

    const input = {
      requesterId: body.requesterId ?? null,
      requesterType: body.requesterType ?? "guest",
      patientName: body.patientName,
      patientAge: body.patientAge ?? null,
      bloodGroup: body.bloodGroup,
      unitsNeeded: body.unitsNeeded ?? 1,
      urgencyLevel: body.urgencyLevel ?? "normal",
      whenNeeded: body.whenNeeded ?? "today",
      neededDate: body.neededDate ?? null,
      neededTime: body.neededTime ?? null,
      district: body.district,
      upazila: body.upazila,
      unionName: body.unionName ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      hospitalName: body.hospitalName,
      hospitalAddress: body.hospitalAddress ?? null,
      contactNumber: body.contactNumber,
      alternativeNumber: body.alternativeNumber ?? null,
      whatsappNumber: body.whatsappNumber ?? null,
      reason: body.reason ?? null,
      patientHbLevel: body.patientHbLevel ?? null,
      status: "active",
      ipAddress: body.ipAddress ?? null,
      userAgent: body.userAgent ?? "mobile-app",
    };

    let requestId: number;
    let created: Record<string, any> | null;
    if (isSupabaseAvailable()) {
      requestId = await createBloodRequestPg(input);
      created = (await getBloodRequestByIdPg(requestId)) as any;
    } else {
      requestId = createBloodRequest(input);
      created = getBloodRequestById(requestId) as any;
    }

    if (rateKey) await incrementRateLimit(rateKey, 15 * 60 * 1000);

    return NextResponse.json({
      id: requestId,
      trackingCode: created?.tracking_code ?? null,
    });
  } catch (err: any) {
    if (err?.message?.startsWith("Too many requests")) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error("[api/requests POST]", err);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 },
    );
  }
}
