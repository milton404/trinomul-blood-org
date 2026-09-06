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
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";

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

async function recordFailedAttemptPg(identifier: string, windowMs: number = 15 * 60 * 1000) {
  const now = Date.now();
  const { rows } = await pgQuery<{ attempt_count: number; first_attempt_at: number }>(
    "SELECT attempt_count, first_attempt_at FROM auth_rate_limits WHERE identifier = $1",
    [identifier],
  );
  const row = rows[0];
  if (!row || now - row.first_attempt_at > windowMs) {
    await pgQuery(
      `INSERT INTO auth_rate_limits (identifier, attempt_count, first_attempt_at, last_attempt_at, locked_until)
       VALUES ($1, 1, $2, $3, NULL)
       ON CONFLICT (identifier) DO UPDATE SET
         attempt_count = 1,
         first_attempt_at = $2,
         last_attempt_at = $3,
         locked_until = NULL`,
      [identifier, now, now],
    );
  } else {
    await pgQuery(
      `UPDATE auth_rate_limits SET attempt_count = attempt_count + 1, last_attempt_at = $1 WHERE identifier = $2`,
      [now, identifier],
    );
  }
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
  const usePg = isSupabaseAvailable();

  // ── Rate limit check ──────────────────────────────────────────────
  if (usePg) {
    const now = Date.now();
    const { rows: rlRows } = await pgQuery<{
      attempt_count: number;
      first_attempt_at: number;
      locked_until: number | null;
    }>(
      "SELECT attempt_count, first_attempt_at, locked_until FROM auth_rate_limits WHERE identifier = $1",
      [key],
    );
    const rl = rlRows[0];
    if (rl?.locked_until && rl.locked_until > now) {
      const waitMin = Math.ceil((rl.locked_until - now) / 60000);
      throw new Error(`Too many attempts. Please try again in ${waitMin} minute(s).`);
    }
    if (rl && now - rl.first_attempt_at <= 15 * 60 * 1000 && rl.attempt_count >= 5) {
      const lockedUntil = now + 15 * 60 * 1000;
      await pgQuery(
        "UPDATE auth_rate_limits SET locked_until = $1 WHERE identifier = $2",
        [lockedUntil, key],
      );
      const waitMin = Math.ceil((lockedUntil - now) / 60000);
      throw new Error(`Too many attempts. Please try again in ${waitMin} minute(s).`);
    }
  } else {
    const limit = checkRateLimit(key);
    if (!limit.allowed) {
      const waitMin = Math.ceil(
        ((limit.lockedUntil ?? limit.resetTime) - Date.now()) / 60000,
      );
      throw new Error(
        `Too many attempts. Please try again in ${waitMin} minute(s).`,
      );
    }
  }

  // ── Look up profile ───────────────────────────────────────────────
  let profile: any;
  if (usePg) {
    const col = isEmail(identifier) ? "email" : "phone";
    const { rows } = await pgQuery(`SELECT * FROM profiles WHERE ${col} = $1`, [identifier]);
    profile = rows[0] || null;
  } else {
    profile = isEmail(identifier)
      ? ((await getProfileByEmail(identifier)) as any)
      : ((await getProfileByPhone(identifier)) as any);
  }

  if (!profile) {
    if (usePg) await recordFailedAttemptPg(key);
    else recordFailedAttempt(key);
    throw new Error("Invalid credentials. Please check and try again.");
  }

  const ok = await verifyPassword(password, profile.password_hash);
  if (!ok) {
    if (usePg) await recordFailedAttemptPg(key);
    else recordFailedAttempt(key);
    throw new Error("Invalid credentials. Please check and try again.");
  }

  // Migrate legacy plaintext password to a bcrypt hash on next login.
  if (!isBcryptHash(profile.password_hash)) {
    const hashed = await hashPassword(password);
    if (usePg) {
      await pgQuery(
        "UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE email = $2",
        [hashed, profile.email],
      );
    } else {
      updateUserPassword(profile.email, hashed);
    }
  }

  // ── Admin scope enforcement for the admin portal ────────────────────
  if (expectedAdminScope !== "any") {
    if (profile.role !== "super_admin" && profile.role !== "admin") {
      throw new Error("This account is not authorized for admin login.");
    }
    if (expectedAdminScope === "district") {
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

  if (usePg) {
    await pgQuery("DELETE FROM auth_rate_limits WHERE identifier = $1", [key]);
  } else {
    clearRateLimit(key);
  }

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
  const usePg = isSupabaseAvailable();

  // ── Rate limit + email uniqueness + profile creation ──────────────────
  let profileId: number;

  if (usePg) {
    const rlRow = await pgQuery<{ attempt_count: number; locked_until: number | null }>(
      "SELECT attempt_count, locked_until FROM auth_rate_limits WHERE identifier = $1",
      [key],
    );
    const rl = rlRow.rows[0];
    if (rl?.locked_until && rl.locked_until > Date.now()) {
      throw new Error("Too many registration attempts. Please try later.");
    }
    if (rl && rl.attempt_count >= 5) {
      throw new Error("Too many registration attempts. Please try later.");
    }

    const existing = await pgQuery("SELECT 1 FROM profiles WHERE email = $1", [input.email]);
    if (existing.rows.length > 0) {
      throw new Error("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    const ins = await pgQuery<{ id: number }>(
      `INSERT INTO profiles (email, password_hash, full_name_en, full_name_bn, phone, blood_group, role, district, upazila, hospital_name_en, hospital_name_bn, license_number, website)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        input.email,
        passwordHash,
        input.fullName,
        input.fullName,
        input.phone,
        null,
        input.role,
        input.district || null,
        input.upazila || null,
        input.hospitalNameEn || null,
        input.hospitalNameBn || null,
        input.licenseNumber || null,
        input.website || null,
      ],
    );
    profileId = ins.rows[0].id;

    if (input.address) {
      await pgQuery("UPDATE profiles SET address = $1, updated_at = NOW() WHERE id = $2", [
        input.address,
        profileId,
      ]);
    }

    await pgQuery("DELETE FROM auth_rate_limits WHERE identifier = $1", [key]);
  } else {
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
    profileId = dbCreateProfile({
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

    if (input.address) {
      dbUpdateProfile(profileId, { address: input.address });
    }

    clearRateLimit(key);
  }

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
    sub: String(profileId),
    email: input.email,
    role: input.role,
  };
  await createSession(payload, false);

  return {
    user: {
      id: profileId,
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
