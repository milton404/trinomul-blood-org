/**
 * Server-side email template overrides + email settings.
 *
 * Templates live as code (lib/email/templates/*) but every system email
 * type can be customized from the admin panel:
 *   - disable the type entirely
 *   - override the subject line
 *   - override the full body HTML (wrapped in the branded layout)
 *
 * Subject/body support {{placeholder}} substitution with the vars each
 * template passes to sendEmail().
 *
 * SOS/alert behavior settings (caps, delays, enable toggle) are also
 * stored here (email_settings table).
 *
 * SERVER-ONLY — never import from client code.
 */

import { getDb } from "@/lib/db";
import { renderEmailLayout } from "@/lib/email/layout";
import {
  EMAIL_SETTINGS,
  getTemplateMeta,
} from "@/lib/email/template-registry";

// ── Settings ───────────────────────────────────────────────────────────

export function getEmailSetting(key: string, fallback: string): string {
  try {
    const row = getDb()
      .prepare(`SELECT value FROM email_settings WHERE key = ?`)
      .get(key) as { value: string | null } | undefined;
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export function getEmailSettingInt(key: string, fallback: number): number {
  const raw = getEmailSetting(key, String(fallback));
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function getEmailSettingBool(key: string, fallback: boolean): boolean {
  const raw = getEmailSetting(key, fallback ? "1" : "0");
  return raw === "1" || raw === "true";
}

/** All settings with defaults applied (for the admin UI). */
export function getAllEmailSettings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const meta of EMAIL_SETTINGS) {
    out[meta.key] = getEmailSetting(meta.key, meta.default);
  }
  return out;
}

export function setEmailSettings(values: Record<string, string>): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO email_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );
  const tx = db.transaction((entries: [string, string][]) => {
    for (const [k, v] of entries) stmt.run(k, v);
  });
  tx(Object.entries(values));
}

// ── Template overrides ─────────────────────────────────────────────────

export interface EmailTemplateOverride {
  key: string;
  subject: string | null;
  body: string | null;
  enabled: boolean;
}

function loadOverride(key: string): EmailTemplateOverride | null {
  try {
    const row = getDb()
      .prepare(
        `SELECT key, subject, body, enabled FROM email_templates WHERE key = ?`,
      )
      .get(key) as
      | { key: string; subject: string | null; body: string | null; enabled: number }
      | undefined;
    if (!row) return null;
    return {
      key: row.key,
      subject: row.subject?.trim() || null,
      body: row.body?.trim() || null,
      enabled: row.enabled !== 0,
    };
  } catch {
    return null;
  }
}

/** Substitute {{placeholders}} in subject/body text. */
export function substituteVars(
  text: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? whole : String(v);
  });
}

export interface AppliedTemplateOverride {
  /** Skip sending entirely (template disabled by admin). */
  skip: boolean;
  subject: string;
  /** Final HTML — the override body wrapped in the branded layout. */
  html: string | null;
}

/**
 * Apply the admin override for an email type. `defaultSubject` is used
 * when no override subject exists; the override body (if set) replaces
 * the built-in body and is wrapped in the branded layout.
 */
export function applyTemplateOverride(
  key: string,
  defaultSubject: string,
  vars: Record<string, string | number | null | undefined>,
): AppliedTemplateOverride {
  const override = loadOverride(key);
  if (override && !override.enabled) {
    return { skip: true, subject: defaultSubject, html: null };
  }

  const subject = override?.subject
    ? substituteVars(override.subject, vars)
    : substituteVars(defaultSubject, vars);

  let html: string | null = null;
  if (override?.body) {
    const meta = getTemplateMeta(key);
    html = renderEmailLayout({
      title: subject,
      accentColor: key === "blood_request_sos_alert" ? "#dc2626" : undefined,
      previewText: subject,
      contentHtml: substituteVars(override.body, vars),
      footerNote: meta
        ? `You received this email from ${"Trinomul Blood Bank"}.`
        : undefined,
    });
  }

  return { skip: false, subject, html };
}

// ── CRUD used by admin actions ─────────────────────────────────────────

export function listEmailTemplateOverrides(): Record<
  string,
  EmailTemplateOverride
> {
  const out: Record<string, EmailTemplateOverride> = {};
  try {
    const rows = getDb()
      .prepare(`SELECT key, subject, body, enabled FROM email_templates`)
      .all() as { key: string; subject: string | null; body: string | null; enabled: number }[];
    for (const r of rows) {
      out[r.key] = {
        key: r.key,
        subject: r.subject,
        body: r.body,
        enabled: r.enabled !== 0,
      };
    }
  } catch {
    /* empty */
  }
  return out;
}

export function saveEmailTemplateOverride(params: {
  key: string;
  subject: string | null;
  body: string | null;
  enabled: boolean;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO email_templates (key, subject, body, enabled, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       subject = excluded.subject,
       body = excluded.body,
       enabled = excluded.enabled,
       updated_at = datetime('now')`,
  ).run(
    params.key,
    params.subject?.trim() || null,
    params.body?.trim() || null,
    params.enabled ? 1 : 0,
  );
}

/** Delete the override row — the template reverts to its built-in default. */
export function resetEmailTemplateOverride(key: string): void {
  getDb().prepare(`DELETE FROM email_templates WHERE key = ?`).run(key);
}
