import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const locale = request.cookies.get("NEXT_LOCALE")?.value || "en";
  return NextResponse.redirect(`${origin}/${locale}/admin/dashboard`);
}
