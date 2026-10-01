import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateOrigin, rejectCsrf } from "@/lib/security/csrf";
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
import { getApprovedDonorView } from "@/lib/auth/approved-donor";
import { coarsenRequestCoords } from "@/lib/privacy/request-coords";
import { createRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { enforceRateLimit } = await import("@/lib/auth/rateLimit");
    await enforceRateLimit("requests-list", 60, 60 * 1000, 5 * 60 * 1000);

    const requests = isSupabaseAvailable()
      ? await getVisibleBloodRequestsPg()
      : getVisibleBloodRequests();

    // Privacy gate: exact hospital coords only for verified donors / admins.
    // Everyone else gets the upazila centroid + canNavigate=false.
    const { canSeeExactCoords } = await getApprovedDonorView();
    const shaped = requests.map((r: any) =>
      coarsenRequestCoords(r, canSeeExactCoords),
    );
    return NextResponse.json(shaped);
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
  if (!validateOrigin(req as unknown as NextRequest)) return rejectCsrf();
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

    const parsed = createRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const input = {
      requesterId: parsed.data.requesterId ?? null,
      requesterType: parsed.data.requesterType ?? "guest",
      patientName: parsed.data.patientName,
      patientAge: parsed.data.patientAge ?? null,
      bloodGroup: parsed.data.bloodGroup,
      unitsNeeded: parsed.data.unitsNeeded ?? 1,
      urgencyLevel: parsed.data.urgencyLevel ?? "normal",
      whenNeeded: parsed.data.whenNeeded ?? "today",
      neededDate: parsed.data.neededDate ?? null,
      neededTime: parsed.data.neededTime ?? null,
      district: parsed.data.district,
      upazila: parsed.data.upazila,
      unionName: parsed.data.unionName ?? null,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      hospitalName: parsed.data.hospitalName,
      hospitalAddress: parsed.data.hospitalAddress ?? null,
      contactNumber: parsed.data.contactNumber,
      alternativeNumber: parsed.data.alternativeNumber ?? null,
      whatsappNumber: parsed.data.whatsappNumber ?? null,
      reason: parsed.data.reason ?? null,
      patientHbLevel: parsed.data.patientHbLevel ?? null,
      status: "active",
      ipAddress: parsed.data.ipAddress ?? null,
      userAgent: parsed.data.userAgent ?? "mobile-app",
      idempotencyKey: parsed.data.idempotencyKey ?? null,
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
