/**
 * Server-only Cloudinary helpers for NID (national ID) image access.
 *
 * NID uploads use `type: "authenticated"` (see app/api/cloudinary/sign/route.ts)
 * so the CDN URL is NOT publicly readable. Admins view NID images through
 * short-lived signed URLs generated here.
 *
 * SECURITY: This module reads CLOUDINARY_API_SECRET from env and must NEVER
 * be imported by a client component. Only import from server actions
 * ("use server") or route handlers / server components.
 */


import { v2 as cloudinary } from "cloudinary";
import { createLogger } from "@/lib/logging/logger";

const logger = createLogger("cloudinary-server");

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

/** Default signed-URL lifetime for NID viewing (5 minutes). */
export const DEFAULT_NID_URL_TTL_SECONDS = 300;

/** Maximum allowed signed-URL lifetime (1 hour) — prevents accidental long-lived URLs. */
export const MAX_NID_URL_TTL_SECONDS = 3600;

/** NID folder prefix — used to validate that a publicId belongs to an NID upload. */
const NID_FOLDER_PREFIX = "trinomul/nid/";

/**
 * Returns true when all server-side Cloudinary credentials are present.
 * Use this to gate admin NID-viewing features with a clear error instead
 * of a cryptic Cloudinary 401.
 */
export function isCloudinaryServerConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

/**
 * Validate that a publicId is well-formed and points at the NID folder.
 * This prevents an admin from requesting a signed URL for an arbitrary
 * resource (e.g., another user's private upload outside the NID folder).
 *
 * Rules:
 *   - non-empty string
 *   - starts with "trinomul/nid/"
 *   - no path traversal segments ("..")
 *   - no backslashes
 *   - length <= 256
 */
export function isValidNidPublicId(publicId: unknown): publicId is string {
  if (typeof publicId !== "string" || publicId.length === 0) return false;
  if (publicId.length > 256) return false;
  if (!publicId.startsWith(NID_FOLDER_PREFIX)) return false;
  if (publicId.includes("..") || publicId.includes("\\")) return false;
  return true;
}

function configureCloudinary(): boolean {
  if (!isCloudinaryServerConfigured()) {
    logger.warn(
      "Cloudinary server credentials not configured — NID signed URL generation disabled.",
    );
    return false;
  }
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
  return true;
}

/**
 * Generate a short-lived signed URL for viewing an authenticated NID image.
 *
 * @param publicId - The Cloudinary public_id of the NID image (must be in
 *                  the `trinomul/nid/` folder). Store this in the
 *                  `profiles.nid_front_url` / `nid_back_url` columns.
 * @param expiresInSec - URL lifetime in seconds. Clamped to
 *                       [1, MAX_NID_URL_TTL_SECONDS]. Defaults to 5 minutes.
 * @returns A signed, time-limited URL string, or null if Cloudinary is not
 *          configured or the publicId is invalid.
 *
 * @example
 *   const url = getSignedNidUrl(profile.nid_front_url, 300);
 *   if (!url) return res.status(503).json({ error: "NID viewing unavailable" });
 *   // url is valid for 5 minutes
 */
export function getSignedNidUrl(
  publicId: string,
  expiresInSec: number = DEFAULT_NID_URL_TTL_SECONDS,
): string | null {
  if (!isValidNidPublicId(publicId)) {
    logger.warn("Rejected NID signed URL request: invalid publicId.", {
      publicIdPrefix: String(publicId).slice(0, 32),
    });
    return null;
  }

  if (!configureCloudinary()) {
    return null;
  }

  // Clamp TTL to a safe range.
  const ttl = Math.max(
    1,
    Math.min(expiresInSec, MAX_NID_URL_TTL_SECONDS),
  );
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;

  try {
    // `cloudinary.url` with sign_url + type: "authenticated" produces a
    // URL that includes a signature + expiry. Cloudinary validates both
    // on request; after `expiresAt` the URL returns 401.
    const signedUrl = cloudinary.url(publicId, {
      type: "authenticated",
      sign_url: true,
      expires_at: expiresAt,
      resource_type: "image",
      // Serve a reasonably-sized preview — NID photos don't need full res
      // for admin review. This also reduces bandwidth + cache size.
      transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
      secure: true,
    });
    return signedUrl;
  } catch (err) {
    logger.error("Failed to generate signed NID URL.", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Batch helper: generate signed URLs for multiple NID publicIds.
 * Returns a map of publicId → signedUrl (null entries for invalid/unconfigured).
 * Useful for the admin verification queue view.
 */
export function getSignedNidUrls(
  publicIds: Array<string | null | undefined>,
  expiresInSec: number = DEFAULT_NID_URL_TTL_SECONDS,
): Array<string | null> {
  return publicIds.map((pid) => (pid ? getSignedNidUrl(pid, expiresInSec) : null));
}

/**
 * Delete an NID asset from Cloudinary. Used when a donor re-uploads their NID
 * (replace the old asset to avoid orphaned PII) or when an admin purges a
 * rejected NID. Server-only — requires API secret.
 *
 * @returns true on success, false on failure or misconfiguration.
 */
export async function deleteNidAsset(publicId: string): Promise<boolean> {
  if (!isValidNidPublicId(publicId)) {
    logger.warn("Rejected NID delete: invalid publicId.", {
      publicIdPrefix: String(publicId).slice(0, 32),
    });
    return false;
  }

  if (!configureCloudinary()) {
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      type: "authenticated",
      resource_type: "image",
    });
    if (result.result === "ok") {
      logger.info("Deleted NID asset from Cloudinary.", { publicId });
      return true;
    }
    logger.warn("Cloudinary delete returned non-ok result.", {
      publicId,
      result,
    });
    return false;
  } catch (err) {
    logger.error("Failed to delete NID asset from Cloudinary.", {
      publicId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}