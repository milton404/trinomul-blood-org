import { NextResponse } from "next/server";
import { getDonorsWithStats } from "@/lib/db";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { getDonorByIdWithStatsPg } from "@/lib/db-actions";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid donor ID" }, { status: 400 });
    }

    const donor = isSupabaseAvailable()
      ? await getDonorByIdWithStatsPg(numericId)
      : getDonorsWithStats().find((d: any) => d.id === numericId) || null;

    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 });
    }
    return NextResponse.json(donor);
  } catch (err) {
    console.error("[api/donors/[id]]", err);
    return NextResponse.json({ error: "Failed to load donor" }, { status: 500 });
  }
}