/**
 * Donor identity verification + presence + bookmark types.
 *
 * These mirror the SQLite schema added in lib/db.ts (initTables) and the
 * migrations in lib/migrations/sqlite-migrations.ts (011–013). The runtime
 * DB is SQLite via better-sqlite3; the Supabase/PG types in types/supabase.ts
 * are mirrored for future PostgreSQL parity.
 */

/** Lifecycle of a donor's identity verification flow. */
export type VerificationStatus =
  | "unverified" // default — donor has not submitted NID yet
  | "pending" // donor uploaded NID, waiting for admin review
  | "verified" // admin approved (phone + NID confirmed)
  | "rejected"; // admin rejected — donor can re-submit

/** Admin-visible verification queue item (joined with profile basics). */
export interface VerificationQueueItem {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  phone: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  nid_number: string | null;
  nid_front_url: string | null;
  nid_back_url: string | null;
  nid_uploaded_at: string | null;
  verification_status: VerificationStatus;
  phone_verified: number;
  is_verified: number;
  created_at: string;
}

/** Payload a donor submits to request verification. */
export interface SubmitNidVerificationInput {
  nidNumber: string;
  nidFrontUrl: string;
  nidBackUrl: string;
}

/** Admin action payload for verifying/rejecting a donor. */
export interface AdminVerifyDonorInput {
  status: "verified" | "rejected";
  note?: string;
}

/** Result of a verification action (returned to client). */
export interface VerificationResult {
  success: boolean;
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  message?: string;
}

/** Donor bookmark row (donor_bookmarks table). */
export interface DonorBookmark {
  id: number;
  user_id: number;
  donor_id: number;
  created_at: string;
}

/** Presence + response metrics shown on the public donor card. */
export interface DonorPresenceMetrics {
  lastActiveAt: string | null;
  responseCount: number;
  responseTotalMs: number;
  /** Avg response time in ms, or null if no responses yet. */
  avgResponseMs: number | null;
  /** Response rate as a 0–1 fraction (responses / matches). */
  responseRate: number | null;
}

/**
 * Public-safe donor profile slice. When `isAnonymous` is true, callers must
 * strip `fullNameEn` / `fullNameBn` / `phone` / `email` before rendering.
 */
export interface PublicDonorProfile {
  id: number;
  bloodGroup: string | null;
  district: string | null;
  upazila: string | null;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  isAnonymous: boolean;
  fullNameEn: string | null;
  fullNameBn: string | null;
  donorSinceYear: number | null;
  presence: DonorPresenceMetrics;
}

/** Guard: returns true if the status string is a valid VerificationStatus. */
export function isVerificationStatus(value: unknown): value is VerificationStatus {
  return (
    value === "unverified" ||
    value === "pending" ||
    value === "verified" ||
    value === "rejected"
  );
}