"use server";

import {
  getProfileByEmail,
  getProfileByPhone,
  createProfile as dbCreateProfile,
  updateProfile as dbUpdateProfile,
  createPasswordReset,
  getPasswordResetByToken,
  markPasswordResetUsed,
  updateUserPassword,
  setAdminAssignment,
  recordActivityLog,
} from "@/lib/db";
import { requireFullAdmin } from "@/lib/auth/permissions";
import {
  hashPassword,
  verifyPassword,
  isBcryptHash,
} from "@/lib/auth/password";
import {
  createSession,
  getSession,
  destroySession,
  type SessionPayload,
} from "@/lib/auth/session";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from "@/lib/auth/rateLimit";
import {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendWelcomeEmail,
} from "@/lib/email";

const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  full_name_en: string | null;
  full_name_bn: string | null;
}

function profileToUser(profile: any): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    full_name_en: profile.full_name_en ?? null,
    full_name_bn: profile.full_name_bn ?? null,
  };
}

/**
 * Authenticate a user by email/phone + password, then issue a session cookie.
 * Migrates legacy plaintext passwords to bcrypt hashes on successful login.
 * Enforces server-side rate limiting (5 attempts / 15 min, then 15 min lockout).
 */
export async function serverLogin(
  identifier: string,
  password: string,
  remember: boolean = false,
  /** Optional: when logging into the admin portal, callers may restrict
   *  which admin scope is expected. 'any' means any admin (full, district,
   *  or super) is accepted — the default for backwards compatibility. */
  expectedAdminScope: "full" | "district" | "any" = "any",
): Promise<{ user: AuthUser; redirectTo: string }> {
  const key = `login:${identifier.toLowerCase()}`;
  const limit = checkRateLimit(key);
  if (!limit.allowed) {
    const waitMin = Math.ceil(
      ((limit.lockedUntil ?? limit.resetTime) - Date.now()) / 60000,
    );
    throw new Error(
      `Too many attempts. Please try again in ${waitMin} minute(s).`,
    );
  }

  const profile = isEmail(identifier)
    ? ((await getProfileByEmail(identifier)) as any)
    : ((await getProfileByPhone(identifier)) as any);

  if (!profile) {
    recordFailedAttempt(key);
    throw new Error("Invalid credentials. Please check and try again.");
  }

  const ok = await verifyPassword(password, profile.password_hash);
  if (!ok) {
    recordFailedAttempt(key);
    throw new Error("Invalid credentials. Please check and try again.");
  }

  // Migrate legacy plaintext password to a bcrypt hash on next login.
  if (!isBcryptHash(profile.password_hash)) {
    const hashed = await hashPassword(password);
    updateUserPassword(profile.email, hashed);
  }

  // ── Admin scope enforcement for the admin portal ────────────────────
  if (expectedAdminScope !== "any") {
    if (profile.role !== "super_admin" && profile.role !== "admin") {
      throw new Error("This account is not authorized for admin login.");
    }
    if (expectedAdminScope === "district") {
      // District admin login: must be either a scoped admin (with
      // assigned_district) OR a super_admin who is allowed everywhere.
      if (
        profile.role !== "super_admin" &&
        profile.role === "admin" &&
        !profile.assigned_district
      ) {
        throw new Error(
          "This account is a full admin, not a district (zila) admin. Please select 'Full Admin' to log in.",
        );
      }
    } else if (expectedAdminScope === "full") {
      // Full admin login: unscoped admin or super_admin are both allowed.
      // A district-scoped admin should not log in through this entry.
      if (
        profile.role !== "super_admin" &&
        profile.role === "admin" &&
        profile.assigned_district
      ) {
        throw new Error(
          "This account is a district (zila) admin. Please select 'Zila Admin' to log in.",
        );
      }
    }
  }

  clearRateLimit(key);

  const payload: SessionPayload = {
    sub: String(profile.id),
    email: profile.email,
    role: profile.role,
  };
  await createSession(payload, remember);

  const redirectTo =
    profile.role === "super_admin" || profile.role === "admin"
      ? "/admin/dashboard"
      : "/profile";

  return { user: profileToUser(profile), redirectTo };
}

/**
 * Register a new account. The password is hashed server-side before storage.
 * Issues a session cookie and returns the new user.
 */
export async function serverRegister(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: "donor" | "patient" | "hospital";
  // Optional hospital-specific fields (used when role === "hospital")
  hospitalNameEn?: string;
  hospitalNameBn?: string;
  licenseNumber?: string;
  website?: string;
  district?: string;
  upazila?: string;
  address?: string;
}): Promise<{ user: AuthUser; redirectTo: string }> {
  const key = `register:${input.email.toLowerCase()}`;
  const limit = checkRateLimit(key, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    throw new Error("Too many registration attempts. Please try later.");
  }

  const existing = (await getProfileByEmail(input.email)) as any;
  if (existing) {
    recordFailedAttempt(key);
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const id = dbCreateProfile({
    email: input.email,
    passwordHash,
    fullNameEn: input.fullName,
    fullNameBn: input.fullName,
    phone: input.phone,
    bloodGroup: null,
    role: input.role,
    district: input.district || null,
    upazila: input.upazila || null,
    hospitalNameEn: input.hospitalNameEn || null,
    hospitalNameBn: input.hospitalNameBn || null,
    licenseNumber: input.licenseNumber || null,
    website: input.website || null,
  });

  // `address` is not part of createProfile's INSERT columns; set it separately.
  if (input.address) {
    dbUpdateProfile(id, { address: input.address });
  }

  clearRateLimit(key);

  // Welcome email (best-effort — never blocks registration).
  try {
    await sendWelcomeEmail({
      to: input.email,
      name: input.fullName,
      role: input.role,
    });
  } catch {
    /* email delivery must never break registration */
  }

  const payload: SessionPayload = {
    sub: String(id),
    email: input.email,
    role: input.role,
  };
  await createSession(payload, false);

  return {
    user: {
      id,
      email: input.email,
      role: input.role,
      full_name_en: input.fullName,
      full_name_bn: input.fullName,
    },
    redirectTo: "/profile",
  };
}

/** Destroy the current session cookie. */
export async function serverLogout(): Promise<void> {
  await destroySession();
}

/**
 * Create a new admin account. The password is hashed with bcrypt before
 * storage. Does NOT issue a session — the new admin must log in separately.
 * Returns the new admin's profile ID.
 */
export async function serverCreateAdmin(input: {
  email: string;
  password: string;
  fullNameEn?: string;
  fullNameBn?: string;
  phone?: string;
  role?: "admin" | "super_admin";
  assignedDistrict?: string | null;
  assignedUpazila?: string | null;
}): Promise<number> {
  // Only main admins (super_admin / full admin) may create admin accounts.
  const ctx = await requireFullAdmin();

  const existing = (await getProfileByEmail(input.email)) as any;
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const role = input.role || "admin";
  const passwordHash = await hashPassword(input.password);
  const id = dbCreateProfile({
    email: input.email,
    passwordHash,
    fullNameEn: input.fullNameEn || input.email,
    fullNameBn: input.fullNameBn || input.fullNameEn || "",
    phone: input.phone || "",
    bloodGroup: null,
    role,
    district: null,
    upazila: null,
    hospitalNameEn: null,
    hospitalNameBn: null,
    licenseNumber: null,
    website: null,
  });

  // District scope only applies to 'admin' accounts (a district set here
  // makes them a sub-admin limited to that district).
  if (role === "admin" && input.assignedDistrict) {
    setAdminAssignment(id, input.assignedDistrict, input.assignedUpazila || null);
  }

  try {
    recordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "admin_created",
      entityType: "profile",
      entityId: String(id),
      details: `Created ${role} account ${input.email}${input.assignedDistrict ? ` (district: ${input.assignedDistrict})` : " (full access)"}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }

  return id;
}

/** Return the currently authenticated user (from the session cookie), or null. */
export async function serverGetCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;
  const profile = (await getProfileByEmail(session.email)) as any;
  if (!profile) return null;
  return profileToUser(profile);
}

/** Return the current session payload (for middleware-free client checks). */
export async function serverGetSession(): Promise<SessionPayload | null> {
  return getSession();
}

/**
 * Request a password reset. Generates a token stored in the DB (15-min expiry).
 * Returns the token so the caller can deliver it via email/SMS, or display it
 * in development. Returns `null` if no account matches (to avoid user
 * enumeration).
 */
export async function serverRequestPasswordReset(
  identifier: string,
): Promise<string | null> {
  const key = `reset:${identifier.toLowerCase()}`;
  const limit = checkRateLimit(key, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    throw new Error("Too many reset attempts. Please try later.");
  }

  const profile = isEmail(identifier)
    ? ((await getProfileByEmail(identifier)) as any)
    : ((await getProfileByPhone(identifier)) as any);

  if (!profile) {
    // Do not reveal whether the account exists.
    return null;
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  createPasswordReset(profile.email || profile.phone, token, expiresAt);
  clearRateLimit(key);

  // Email the reset link when the account has an email on file
  // (best-effort — never blocks the reset flow).
  if (profile.email) {
    try {
      await sendPasswordResetEmail({
        to: profile.email,
        name: profile.full_name_en || profile.full_name_bn || "there",
        token,
      });
    } catch {
      /* email delivery must never break the reset flow */
    }
  }

  return token;
}

/** Validate a reset token and set a new password (hashed). */
export async function serverResetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  const row = getPasswordResetByToken(token);
  if (!row) {
    throw new Error("Invalid or already-used reset token.");
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error("This reset token has expired. Please request a new one.");
  }

  const hashed = await hashPassword(newPassword);
  updateUserPassword(row.identifier, hashed);
  markPasswordResetUsed(row.id);

  // Confirmation email when the identifier is an email address
  // (best-effort — never blocks the reset).
  if (isEmail(row.identifier)) {
    try {
      const profile = (await getProfileByEmail(row.identifier)) as any;
      await sendPasswordResetSuccessEmail({
        to: row.identifier,
        name: profile?.full_name_en || profile?.full_name_bn || "there",
      });
    } catch {
      /* never block the reset */
    }
  }
}

function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
