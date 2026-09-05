/**
 * POST /api/cloudinary/sign
 *
 * Generates a SIGNED Cloudinary upload signature so the browser can upload
 * directly to Cloudinary without exposing our API secret.
 *
 * Flow:
 *   1. Client calls this endpoint with upload params (file size, type, tag, etc.)
 *   2. Server validates credentials + rate limit → signs params with API_SECRET
 *   3. Client receives signature, api_key, timestamp, and uploads to
 *      https://api.cloudinary.com/v1_1/<cloud>/image/upload using XHR/form
 *
 * Why signed instead of unsigned preset?
 *   - Strict control: enforce folder, max file size, content types per-upload
 *   - No reliance on the default "ml_default" preset being unsigned
 *   - Invalidation/delete tokens can be issued server-side later
 *
 * Expected JSON body:
 *   {
 *     "useCase": "avatar" | "social_post",       // selects folder and rules
 *     "fileSizeBytes": number,                    // for size validation
 *     "contentType": "image/jpeg" | "image/png" | "image/webp"   // optional
 *   }
 *
 * Response JSON:
 *   {
 *     "cloudName": string,
 *     "apiKey": string,
 *     "uploadPreset": string | null,
 *     "folder": string,
 *     "signature": string,
 *     "timestamp": number,
 *     "paramsToSign": { ... },           // exact key/value pairs that were signed
 *     "uploadUrl": string                // https://api.cloudinary.com/v1_1/<cloud>/image/upload
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per image
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FOLDERS: Record<string, string> = {
  avatar: "trinomul/avatars",
  social_post: "trinomul/social",
  nid: "trinomul/nid",
};

const TAGS: Record<string, string> = {
  avatar: "trinomul_avatar",
  social_post: "trinomul_social",
  nid: "trinomul_nid",
};

// ────────────────────────────────────────────────────────────────────────────
// Rate limiting (in-memory, per-IP) — mirrors voice-chat pattern
// ────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 30;            // signature requests per window
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const ipHits = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  if (hits.length >= RATE_LIMIT_MAX) return false;
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

type UseCase = "avatar" | "social_post" | "nid";

function isUseCase(u: unknown): u is UseCase {
  return u === "avatar" || u === "social_post" || u === "nid";
}

// ────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 0. Gather IP ─────────────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // ── 1. Credential check (server-only, never exposed) ─────────────────────
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Server Cloudinary credentials not configured." },
      { status: 500 },
    );
  }

  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });

  // ── 2. Rate limit ────────────────────────────────────────────────────────
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many upload attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  // ── 3. Parse & validate body ─────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const useCase = body?.useCase;
  if (!isUseCase(useCase)) {
    return NextResponse.json(
      { error: 'useCase must be "avatar", "social_post", or "nid".' },
      { status: 400 },
    );
  }

  const fileSizeBytes = Number(body?.fileSizeBytes);
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return NextResponse.json(
      { error: "fileSizeBytes must be a positive number." },
      { status: 400 },
    );
  }
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `File too large. Max size is ${
          MAX_FILE_SIZE_BYTES / 1024 / 1024
        } MB.`,
      },
      { status: 413 },
    );
  }

  if (body?.contentType && !ALLOWED_MIME_TYPES.includes(body.contentType)) {
    return NextResponse.json(
      {
        error: `Content type not allowed. Expected one of: ${ALLOWED_MIME_TYPES.join(
          ", ",
        )}`,
      },
      { status: 400 },
    );
  }

  // ── 4. Build params to sign ──────────────────────────────────────────────
  const folder = FOLDERS[useCase];
  const tags = TAGS[useCase];
  const timestamp = Math.floor(Date.now() / 1000);

  // IMPORTANT: Only primitive values (string, number, boolean) can be signed.
  // Order in the object does not matter for Cloudinary's sign helper (it
  // sorts internally), but we list them explicitly for auditability.
  //
  // Delivery type:
  //   - avatar / social_post → "upload" (publicly readable via CDN)
  //   - nid → "authenticated" (requires signed URL to view — PII protection
  //     for national ID photos. Admins get short-lived signed URLs via
  //     lib/cloudinary-server.ts → getSignedNidUrl.)
  const deliveryType = useCase === "nid" ? "authenticated" : "upload";

  const paramsToSign: Record<string, string | number | boolean> = {
    timestamp,
    folder,
    tags,
    // Use a conservative transformation: ensure max 2048px on longest edge,
    // auto-quality, auto-format (WebP when possible) on delivery — not on upload.
    // If you wanted to enforce these AT upload time you would add eager
    // transformations and sign them too.
    overwrite: useCase === "avatar" ? true : false,
    // Allow anyone to read the uploaded asset via its CDN URL (profiles &
    // social posts are all public-facing images on this site).
    // NID uploads use "authenticated" delivery — the URL is not publicly
    // readable; admins access via short-lived signed URLs only.
    type: deliveryType,
  };

  // ── 5. Generate the signature ────────────────────────────────────────────
  // api_sign_request produces the sha1 hex digest of:
  //   sorted_key1=val1&sorted_key2=val2...&api_secret
  // using only the params passed in (excluding `file`, `api_key`, `cloud_name`,
  // `resource_type`). It automatically ignores any keys Cloudinary doesn't sign.
  const signature = cloudinary.utils.api_sign_request(paramsToSign, API_SECRET);

  return NextResponse.json({
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    folder,
    tags,
    signature,
    timestamp,
    paramsToSign,
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
  });
}
