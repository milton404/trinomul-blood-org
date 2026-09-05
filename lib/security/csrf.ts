import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS", "TRACE"];

function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    return "";
  }
}

function getExpectedOrigins(): string[] {
  const origins: string[] = [];

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    origins.push(normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL));
  }

  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    origins.push(`https://${vercelUrl}`);
  }

  return origins.filter(Boolean);
}

export function validateOrigin(request: NextRequest): boolean {
  if (SAFE_METHODS.includes(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const expectedOrigins = getExpectedOrigins();

  if (expectedOrigins.length === 0) {
    return process.env.NODE_ENV === "development";
  }

  if (origin) {
    const normalizedOrigin = normalizeOrigin(origin);
    return expectedOrigins.includes(normalizedOrigin);
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      return expectedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  return false;
}

export function rejectCsrf(): NextResponse {
  return NextResponse.json(
    { error: "CSRF validation failed" },
    { status: 403 },
  );
}

export function withCsrfProtection(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
): (req: NextRequest) => Promise<NextResponse> | NextResponse {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (!validateOrigin(req)) {
      return rejectCsrf();
    }
    return handler(req);
  };
}