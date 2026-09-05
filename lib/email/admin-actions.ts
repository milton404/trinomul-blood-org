"use server";

/**
 * Admin email center server actions:
 *  - search donors (any group / active / inactive) as email recipients
 *  - send a custom email to selected donors
 *  - send a blood-request email to selected donors from a request card
 *  - view the email_log audit trail + stats
 *  - edit system email templates (subject/body overrides, disable switch)
 *  - manage alert + SOS settings (caps, delays, enable toggle)
 *
 * All actions require an admin session (requireAdmin()).
 */

import { getDb, getBloodRequestById, recordDonorMatches } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";
import { createLogger } from "@/lib/logging/logger";
import { sendEmail } from "@/lib/email/send";
import {
  renderEmailLayout,
  escapeHtml,
  getSiteUrl,
} from "@/lib/email/layout";
import { renderBloodRequestAlertEmail } from "@/lib/email/templates/blood-request-alert";
import {
  EMAIL_SETTINGS,
  EMAIL_TEMPLATES,
  getTemplateMeta,
} from "@/lib/email/template-registry";
import {
  listEmailTemplateOverrides,
  saveEmailTemplateOverride,
  resetEmailTemplateOverride,
  getAllEmailSettings,
  setEmailSettings,
} from "@/lib/email/template-settings";
import type { DonorMatch } from "@/lib/db";

const logger = createLogger("email-admin");

// ── Recipient search ───────────────────────────────────────────────────

export interface AdminEmailDonor {
  id: number;
  email: string;
  full_name_en: string | null;
  full_name_bn: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  phone_number: string | null;
  is_active: number;
  email_opt_in: number;
}

/**
 * Search donor profiles usable as email recipients.
 * Supports: blood-group multi-select, district, upazila, active status
 * ('all' | 'active' | 'inactive'), free-text name/email search, limit.
 */
export async function serverAdminSearchEmailDonors(filters: {
  bloodGroups?: string[];
  district?: string;
  upazila?: string;
  activeStatus?: "all" | "active" | "inactive";
  search?: string;
  limit?: number;
}): Promise<AdminEmailDonor[]> {
  await requireAdmin();
  const db = getDb();

  const where: string[] = [
    `p.email IS NOT NULL AND p.email != ''`,
    `p.role = 'donor'`,
  ];
  const params: Record<string, unknown> = {};

  if (filters.bloodGroups?.length) {
    where.push(`p.blood_group IN (${filters.bloodGroups.map((_, i) => `@bg${i}`).join(",")})`);
    filters.bloodGroups.forEach((bg, i) => (params[`bg${i}`] = bg));
  }
  if (filters.district) {
    where.push(`p.district = @district`);
    params.district = filters.district;
  }
  if (filters.upazila) {
    where.push(`p.upazila = @upazila`);
    params.upazila = filters.upazila;
  }
  if (filters.activeStatus === "active") where.push(`p.is_active = 1`);
  if (filters.activeStatus === "inactive") where.push(`p.is_active != 1`);
  if (filters.search?.trim()) {
    where.push(
      `(p.full_name_en LIKE @q OR p.full_name_bn LIKE @q OR p.email LIKE @q OR p.phone_number LIKE @q)`,
    );
    params.q = `%${filters.search.trim()}%`;
  }

  return db
    .prepare(
      `SELECT p.id, p.email, p.full_name_en, p.full_name_bn, p.blood_group,
              p.district, p.upazila, p.phone_number, p.is_active,
              COALESCE(p.email_opt_in, 1) as email_opt_in
       FROM profiles p
       WHERE ${where.join(" AND ")}
       ORDER BY p.is_active DESC, p.full_name_en ASC
       LIMIT @limit`,
    )
    .all({ ...params, limit: Math.min(filters.limit ?? 200, 500) }) as AdminEmailDonor[];
}

// ── Custom email ───────────────────────────────────────────────────────

export interface AdminCustomEmailResult {
  sent: number;
  skipped: number;
  total: number;
}

/** Plain-text admin message → safe HTML paragraphs. */
function messageToHtml(message: string): string {
  return escapeHtml(message)
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;font-size:15px;color:#334155;white-space:pre-wrap;">${p}</p>`,
    )
    .join("");
}

/**
 * Send a custom admin email to a specific list of donor IDs.
 * The body is wrapped in the branded Trinomul layout. Respects the daily
 * cap (per-recipient) and logs every send to email_log.
 */
export async function serverAdminSendCustomEmail(params: {
  recipientIds: number[];
  subject: string;
  message: string;
}): Promise<AdminCustomEmailResult> {
  const ctx = await requireAdmin();
  if (!params.subject.trim() || !params.message.trim()) {
    throw new Error("Subject and message are required.");
  }
  if (!params.recipientIds.length) {
    throw new Error("Select at least one recipient.");
  }

  const db = getDb();
  const placeholders = params.recipientIds.map((_, i) => `@id${i}`).join(",");
  const recipients = db
    .prepare(
      `SELECT id, email, full_name_en, full_name_bn FROM profiles
       WHERE id IN (${placeholders}) AND email IS NOT NULL AND email != ''`,
    )
    .all(
      Object.fromEntries(params.recipientIds.map((id, i) => [`id${i}`, id])),
    ) as { id: number; email: string; full_name_en: string | null; full_name_bn: string | null }[];

  let sent = 0;
  for (const r of recipients) {
    const name = r.full_name_en || r.full_name_bn || "Donor";
    const html = renderEmailLayout({
      title: params.subject,
      accentColor: "#0f172a",
      accentBg: "#f8fafc",
      previewText: params.subject,
      contentHtml: `<p style="margin:0 0 12px;font-size:15px;color:#334155;">Hi ${escapeHtml(name)},</p>${messageToHtml(params.message)}`,
      footerNote: `You received this email from the Trinomul Blood Bank admin team.`,
    });
    const result = await sendEmail({
      to: r.email,
      type: "admin_custom",
      subject: params.subject,
      html,
      text: `Hi ${name}, ${params.message}`,
    });
    if (result.sent) sent++;
  }

  logger.info("Admin custom email dispatched", {
    actor: ctx.email,
    recipients: String(recipients.length),
    sent,
  });

  return { sent, skipped: recipients.length - sent, total: recipients.length };
}

// ── Request email from a request card ──────────────────────────────────

/**
 * Send the blood-request alert email to a specific list of donor IDs,
 * optionally with an extra admin note on top. Records donor_matches rows
 * with notification_method = 'admin_email' so the Donor Match panel
 * tracks admin-initiated sends.
 */
export async function serverAdminSendRequestEmail(params: {
  requestId: number;
  donorIds: number[];
  customNote?: string;
  sos?: boolean;
}): Promise<AdminCustomEmailResult> {
  const ctx = await requireAdmin();
  if (!params.donorIds.length) {
    throw new Error("Select at least one donor.");
  }

  const req = getBloodRequestById(params.requestId) as
    | Record<string, any>
    | undefined;
  if (!req) throw new Error("Request not found.");

  const db = getDb();
  const placeholders = params.donorIds.map((_, i) => `@id${i}`).join(",");
  const recipients = db
    .prepare(
      `SELECT id, email, full_name_en, full_name_bn, blood_group, district,
              upazila, union_name FROM profiles
       WHERE id IN (${placeholders}) AND email IS NOT NULL AND email != ''`,
    )
    .all(
      Object.fromEntries(params.donorIds.map((id, i) => [`id${i}`, id])),
    ) as {
    id: number;
    email: string;
    full_name_en: string | null;
    full_name_bn: string | null;
    blood_group: string | null;
    district: string | null;
    upazila: string | null;
    union_name: string | null;
  }[];

  const noteHtml = params.customNote?.trim()
    ? `<div style="background:#eff6ff;border-left:3px solid #2563eb;padding:12px 16px;border-radius:8px;margin:0 0 16px;">
         <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;">Message from admin</p>
         <p style="margin:0;color:#1e3a8a;font-size:14px;white-space:pre-wrap;">${escapeHtml(params.customNote.trim())}</p>
       </div>`
    : "";

  const siteUrl = getSiteUrl();
  const trackUrl = req.tracking_code
    ? `${siteUrl}/track/${encodeURIComponent(req.tracking_code)}`
    : siteUrl;

  let sent = 0;
  const sentRows: DonorMatch[] = [];
  for (const r of recipients) {
    const name = r.full_name_en || r.full_name_bn || "Donor";
    // Base request-alert email + admin note injected before the CTA row.
    const baseHtml = renderBloodRequestAlertEmail(req, name, params.sos === true);
    const html = noteHtml
      ? baseHtml.replace(
          /<p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong>If you can donate/,
          `${noteHtml}<p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong>If you can donate`,
        )
      : baseHtml;

    const result = await sendEmail({
      to: r.email,
      type: params.sos ? "admin_request_sos" : "admin_request",
      requestId: params.requestId,
      subject: params.sos
        ? `🚨 EMERGENCY: ${req.blood_group} blood needed NOW — ${req.patient_name}`
        : `🩸 ${req.blood_group} blood needed — ${req.patient_name}`,
      html,
      text: `${params.sos ? "EMERGENCY: " : ""}${req.blood_group} blood needed for ${req.patient_name}. Track: ${trackUrl}`,
    });
    if (result.sent) {
      sent++;
      sentRows.push({
        id: r.id,
        match_rank: sent,
        match_score: 100 - sent,
      } as unknown as DonorMatch);
    }
  }

  if (sentRows.length > 0) {
    try {
      recordDonorMatches(
        params.requestId,
        sentRows,
        params.sos ? "admin_email_sos" : "admin_email",
      );
    } catch {
      /* best-effort */
    }
  }

  logger.info("Admin request email dispatched", {
    actor: ctx.email,
    requestId: String(params.requestId),
    recipients: recipients.length,
    sent,
  });

  return { sent, skipped: recipients.length - sent, total: recipients.length };
}

// ── Email log ──────────────────────────────────────────────────────────

export interface AdminEmailLogRow {
  id: number;
  type: string | null;
  to_email: string;
  request_id: number | null;
  status: string;
  error: string | null;
  created_at: string;
}

export async function serverAdminGetEmailLog(filters?: {
  limit?: number;
  offset?: number;
  type?: string;
}): Promise<{ rows: AdminEmailLogRow[]; total: number }> {
  await requireAdmin();
  const db = getDb();
  const limit = Math.min(filters?.limit ?? 50, 200);
  const offset = filters?.offset ?? 0;

  const where = filters?.type ? `WHERE type = @type` : "";
  // better-sqlite3 throws on extra named params — build two param sets.
  const typeParam = filters?.type ? { type: filters.type } : {};

  const rows = db
    .prepare(
      `SELECT id, type, to_email, request_id, status, error, created_at
       FROM email_log ${where}
       ORDER BY id DESC LIMIT @limit OFFSET @offset`,
    )
    .all({ ...typeParam, limit, offset }) as AdminEmailLogRow[];
  const total = (
    db
      .prepare(`SELECT COUNT(*) as c FROM email_log ${where}`)
      .get(typeParam) as { c: number }
  ).c;

  return { rows, total };
}

export interface AdminEmailStats {
  sentToday: number;
  sentTotal: number;
  failedTotal: number;
  skippedTotal: number;
  donorCount: number;
  optedInCount: number;
}

export async function serverAdminGetEmailStats(): Promise<AdminEmailStats> {
  await requireAdmin();
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const count = (sql: string, p: Record<string, unknown> = {}) =>
    (db.prepare(sql).get(p) as { c: number }).c;

  return {
    sentToday: count(
      `SELECT COUNT(*) as c FROM email_log WHERE status='sent' AND date(created_at)=@d`,
      { d: today },
    ),
    sentTotal: count(`SELECT COUNT(*) as c FROM email_log WHERE status='sent'`),
    failedTotal: count(`SELECT COUNT(*) as c FROM email_log WHERE status='failed'`),
    skippedTotal: count(
      `SELECT COUNT(*) as c FROM email_log WHERE status LIKE 'skipped%'`,
    ),
    donorCount: count(
      `SELECT COUNT(*) as c FROM profiles WHERE role='donor' AND email IS NOT NULL AND email != ''`,
    ),
    optedInCount: count(
      `SELECT COUNT(*) as c FROM profiles WHERE role='donor' AND email IS NOT NULL AND email != '' AND COALESCE(email_opt_in,1)=1`,
    ),
  };
}

// ── Template editor ────────────────────────────────────────────────────

export interface AdminEmailTemplate {
  key: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  defaultSubject: string;
  placeholders: { name: string; description: string }[];
  /** Current override (null fields = using the built-in default). */
  subject: string | null;
  body: string | null;
  enabled: boolean;
  /** True when an override row exists in the DB. */
  isOverridden: boolean;
}

/** All system templates + their current overrides (for the editor UI). */
export async function serverAdminGetEmailTemplates(): Promise<
  AdminEmailTemplate[]
> {
  await requireAdmin();
  const overrides = listEmailTemplateOverrides();
  return EMAIL_TEMPLATES.map((meta) => {
    const o = overrides[meta.key];
    return {
      key: meta.key,
      name: meta.name,
      nameBn: meta.nameBn,
      description: meta.description,
      descriptionBn: meta.descriptionBn,
      defaultSubject: meta.defaultSubject,
      placeholders: meta.placeholders,
      subject: o?.subject ?? null,
      body: o?.body ?? null,
      enabled: o ? o.enabled : true,
      isOverridden: Boolean(o),
    };
  });
}

export async function serverAdminSaveEmailTemplate(params: {
  key: string;
  subject: string | null;
  body: string | null;
  enabled: boolean;
}): Promise<void> {
  const ctx = await requireAdmin();
  if (!getTemplateMeta(params.key)) {
    throw new Error("Unknown email template.");
  }
  saveEmailTemplateOverride({
    key: params.key,
    subject: params.subject,
    body: params.body,
    enabled: params.enabled,
  });
  logger.info("Email template override saved", {
    actor: ctx.email,
    key: params.key,
  });
}

/** Delete the override — the template reverts to its built-in default. */
export async function serverAdminResetEmailTemplate(
  key: string,
): Promise<void> {
  const ctx = await requireAdmin();
  if (!getTemplateMeta(key)) {
    throw new Error("Unknown email template.");
  }
  resetEmailTemplateOverride(key);
  logger.info("Email template override reset", { actor: ctx.email, key });
}

// ── Alert / SOS settings ───────────────────────────────────────────────

export async function serverAdminGetEmailSettings(): Promise<
  Record<string, string>
> {
  await requireAdmin();
  return getAllEmailSettings();
}

export async function serverAdminSaveEmailSettings(
  values: Record<string, string>,
): Promise<void> {
  const ctx = await requireAdmin();
  // Only accept known setting keys; validate numbers.
  const clean: Record<string, string> = {};
  for (const meta of EMAIL_SETTINGS) {
    const raw = values[meta.key];
    if (raw === undefined) continue;
    if (meta.kind === "number") {
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n)) {
        throw new Error(`Invalid number for "${meta.label}".`);
      }
      const min = meta.min ?? 0;
      const max = meta.max ?? 100000;
      clean[meta.key] = String(Math.min(Math.max(n, min), max));
    } else {
      clean[meta.key] = raw === "1" || raw === "true" ? "1" : "0";
    }
  }
  setEmailSettings(clean);
  logger.info("Email settings saved", {
    actor: ctx.email,
    keys: Object.keys(clean).join(","),
  });
}
