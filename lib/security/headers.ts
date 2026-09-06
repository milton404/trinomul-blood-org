import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo";

const isProduction = process.env.NODE_ENV === "production";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function buildCspHeader(nonce: string): string {
  const self = "'self'";
  const unsafeInline = "'unsafe-inline'";
  const unsafeEval = "'unsafe-eval'";
  const nonceValue = `'nonce-${nonce}'`;

  const cloudinaryImg = CLOUDINARY_CLOUD_NAME
    ? `https://res.cloudinary.com`
    : "";
  const cloudinaryUpload = CLOUDINARY_CLOUD_NAME
    ? `https://api.cloudinary.com`
    : "";

  const connectSources = [
    self,
    "https://api.cloudinary.com",
    "https://res.cloudinary.com",
    SITE_URL,
  ].filter(Boolean);

  const imgSources = [
    self,
    "data:",
    "blob:",
    cloudinaryImg,
    "https://picsum.photos",
    "https://*.tile.openstreetmap.org",
    "https://server.arcgisonline.com",
  ].filter(Boolean);

  const frameSources = ["'none'"];

  const fontSources = [self, "data:", "https://fonts.gstatic.com"].filter(
    Boolean,
  );

  const styleSources = [self, unsafeInline];

  const scriptSources = isProduction
    ? [self, nonceValue]
    : [self, nonceValue, unsafeEval, unsafeInline];

  return [
    `default-src ${self}`,
    `script-src ${scriptSources.join(" ")}`,
    `style-src ${styleSources.join(" ")}`,
    `img-src ${imgSources.join(" ")}`,
    `font-src ${fontSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function applySecurityHeaders(
  response: NextResponse,
): NextResponse & { headers: { get(name: string): string | null } } {
  const nonce = generateNonce();
  const csp = buildCspHeader(nonce);

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
  );

  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  response.headers.set("X-Nonce", nonce);

  return response as NextResponse & {
    headers: { get(name: string): string | null };
  };
}

export function getNonceFromHeaders(
  headers: Headers,
): string | null {
  return headers.get("x-nonce");
}

export { buildCspHeader, generateNonce };