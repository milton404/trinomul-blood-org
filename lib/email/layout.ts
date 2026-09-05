/**
 * Shared branded email layout for every Trinomul Blood Bank email.
 *
 * Email-client-safe: inline CSS only, table-based structure (Outlook-safe),
 * logo loaded from an absolute https:// URL.
 *
 * SERVER-ONLY — never import from client code.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trinomul.org";
const EMAIL_LOGO_URL =
  process.env.EMAIL_LOGO_URL || `${SITE_URL}/trinomul-logo.png`;

export interface EmailLayoutOptions {
  /** Page/browser-tab style title, also shown in the header. */
  title: string;
  /** Service-specific inner HTML (already inline-styled). */
  contentHtml: string;
  /** Main accent color (buttons, borders). */
  accentColor?: string;
  /** Light tint used behind the header strip. */
  accentBg?: string;
  /** Inbox preview text (hidden preheader). */
  previewText?: string;
  /** Extra footer note, e.g. "You received this because…". */
  footerNote?: string;
}

const BRAND = "Trinomul Blood Bank";
const BRAND_SUB = "Rangpur, Bangladesh";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getSiteUrl(): string {
  return SITE_URL;
}

/** Render a full HTML email document with the shared Trinomul brand shell. */
export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const accent = opts.accentColor || "#dc2626";
  const accentBg = opts.accentBg || "#fef2f2";
  const preview = opts.previewText || opts.title;

  return `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(opts.title)}</title></head>
  <body style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;">
    <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="background:${accentBg};padding:20px 32px;border-bottom:3px solid ${accent};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;width:52px;">
                <img src="${EMAIL_LOGO_URL}" alt="${BRAND} logo" width="44" height="44" style="display:block;border-radius:10px;" />
              </td>
              <td style="vertical-align:middle;padding-left:12px;">
                <div style="font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">${BRAND}</div>
                <div style="font-size:12px;color:#64748b;">${BRAND_SUB}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          ${opts.contentHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 6px;text-align:center;font-size:12px;color:#94a3b8;">
            ${BRAND} &middot; <a href="${SITE_URL}" style="color:#64748b;text-decoration:underline;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
          </p>
          ${opts.footerNote ? `<p style="margin:0;text-align:center;font-size:11px;color:#cbd5e1;">${opts.footerNote}</p>` : ""}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A primary call-to-action button (anchor styled as button). */
export function emailButton(
  href: string,
  label: string,
  color = "#dc2626",
): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:4px 6px 4px 0;padding:11px 20px;background:${color};color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">${escapeHtml(label)}</a>`;
}

/** A small labelled detail row used inside patient/detail grids. */
export function emailDetailRow(
  label: string,
  value: string,
  opts: { strong?: boolean; mono?: boolean } = {},
): string {
  const style = opts.strong
    ? `font-size:18px;font-weight:700;color:#dc2626;${opts.mono ? "font-family:'Courier New',monospace;" : ""}`
    : `font-size:14px;color:#0f172a;${opts.mono ? "font-family:'Courier New',monospace;" : ""}`;
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;${style}">${escapeHtml(value)}</td>
  </tr>`;
}
