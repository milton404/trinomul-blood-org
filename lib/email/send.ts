/**
 * Thin Resend send wrapper used by every email template.
 *
 * - Never throws: all failures are logged only (existing pattern).
 * - Graceful no-op when RESEND_API_KEY is missing (local dev works).
 * - Daily cap guard so the Resend free tier (100/day) keeps headroom
 *   for password resets (in-memory counter, per server instance).
 * - Best-effort audit trail in the email_log table.
 *
 * SERVER-ONLY — never import from client code.
 */

import { Resend } from "resend";
import { createLogger } from "@/lib/logging/logger";
import { dbRecordEmailLog } from "@/lib/db";
import { applyTemplateOverride } from "@/lib/email/template-settings";

const logger = createLogger("email");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "Trinomul Blood Bank <noreply@trinomul.org>";
const DAILY_EMAIL_CAP = parseInt(process.env.DAILY_EMAIL_CAP || "90", 10);

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

/** True when Resend is configured (API key present). */
export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

// ── Daily send cap (in-memory, per server instance) ────────────────────
let sentToday = { date: "", count: 0 };

function dailyQuotaReached(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (sentToday.date !== today) {
    sentToday = { date: today, count: 0 };
  }
  return sentToday.count >= DAILY_EMAIL_CAP;
}

function countSend() {
  const today = new Date().toISOString().slice(0, 10);
  if (sentToday.date !== today) {
    sentToday = { date: today, count: 0 };
  }
  sentToday.count += 1;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback (recommended). */
  text?: string;
  /** Logical email type for the audit log, e.g. "blood_request_alert". */
  type?: string;
  /** Related blood request id, when applicable. */
  requestId?: number;
  /** When true, the send ignores the daily cap (password resets etc.). */
  bypassDailyCap?: boolean;
  /**
   * Placeholder values for admin template overrides ({{patient_name}} etc.).
   * Also enables the per-type disable switch and subject/body overrides.
   */
  vars?: Record<string, string | number | null | undefined>;
}

export interface SendEmailResult {
  sent: boolean;
  skippedReason?: "not_configured" | "daily_cap" | "template_disabled";
}

/** Send one transactional email. Never throws. */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const record = (status: string, error?: string) => {
    try {
      dbRecordEmailLog({
        type: params.type || null,
        toEmail: params.to,
        requestId: params.requestId ?? null,
        status,
        error: error ?? null,
      });
    } catch {
      /* best-effort audit */
    }
  };

  // Admin template overrides: disable switch, subject override, body
  // override (wrapped in the branded layout). Types without a registered
  // template (admin_custom etc.) pass through untouched.
  let subject = params.subject;
  let html = params.html;
  if (params.type) {
    try {
      const applied = applyTemplateOverride(
        params.type,
        params.subject,
        params.vars ?? {},
      );
      if (applied.skip) {
        logger.info("Email template disabled by admin — skipping", {
          to: params.to,
          type: params.type,
        });
        record("skipped_template_disabled");
        return { sent: false, skippedReason: "template_disabled" };
      }
      subject = applied.subject;
      if (applied.html) html = applied.html;
    } catch {
      /* fall through with built-in defaults */
    }
  }

  const c = getClient();
  if (!c) {
    logger.warn("RESEND_API_KEY not set — skipping email", { to: params.to });
    record("skipped_not_configured");
    return { sent: false, skippedReason: "not_configured" };
  }

  if (!params.bypassDailyCap && dailyQuotaReached()) {
    logger.warn("Daily email cap reached — skipping email", {
      to: params.to,
      type: params.type,
    });
    record("skipped_daily_cap");
    return { sent: false, skippedReason: "daily_cap" };
  }

  try {
    const { error } = await c.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject,
      html,
      ...(params.text ? { text: params.text } : {}),
    });
    if (error) {
      logger.error("Resend send failed", {
        to: params.to,
        error: error.message,
      });
      record("failed", error.message);
      return { sent: false };
    }
    countSend();
    record("sent");
    return { sent: true };
  } catch (err) {
    logger.error("Resend send threw", {
      to: params.to,
      error: err instanceof Error ? err.message : String(err),
    });
    record(
      "failed",
      err instanceof Error ? err.message : String(err),
    );
    return { sent: false };
  }
}
