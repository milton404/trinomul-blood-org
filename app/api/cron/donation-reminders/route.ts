import { NextResponse } from "next/server";
import { sendDueDonationRemindersPg } from "@/lib/reminders/scheduler";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendDueDonationRemindersPg();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("donation-reminders cron failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send reminders" },
      { status: 500 },
    );
  }
}