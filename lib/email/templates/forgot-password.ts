/**
 * Password reset email — secure, minimal, single CTA.
 * The reset token expires in 15 minutes (see lib/auth/actions.ts).
 * SERVER-ONLY.
 */

import {
  renderEmailLayout,
  emailButton,
  escapeHtml,
  getSiteUrl,
} from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";

export interface PasswordResetEmailParams {
  to: string;
  name: string;
  token: string;
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<void> {
  const siteUrl = getSiteUrl();
  const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(params.token)}`;

  await sendEmail({
    to: params.to,
    type: "password_reset",
    subject: "Reset your password — Trinomul Blood Bank",
    // Password resets must always go out, even close to the daily cap.
    bypassDailyCap: true,
    html: renderEmailLayout({
      title: "Reset your password",
      accentColor: "#0f172a",
      accentBg: "#f8fafc",
      previewText: "A password reset was requested for your account.",
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hi ${escapeHtml(params.name)},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">
          We received a request to reset the password for your Trinomul Blood Bank account.
          Click the button below to choose a new password.
        </p>
        <div style="text-align:center;margin:0 0 16px;">
          ${emailButton(resetUrl, "🔐 Reset password", "#0f172a")}
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
          This link expires in <strong>15 minutes</strong> and can be used only once.
        </p>
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
          If the button doesn't work, copy and paste this link into your browser:<br />
          <a href="${escapeHtml(resetUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(resetUrl)}</a>
        </p>
        <p style="margin:16px 0 0;font-size:13px;color:#64748b;">
          <strong>Not you?</strong> If you did not request a password reset, you can safely ignore
          this email — your password will not change.
        </p>
      `,
      footerNote:
        "You received this email because a password reset was requested for your account.",
    }),
    text: `Reset your Trinomul Blood Bank password: ${resetUrl} (expires in 15 minutes). If you did not request this, ignore this email.`,
    // Placeholders available to admin template overrides.
    vars: {
      name: params.name,
      reset_url: resetUrl,
      site_url: siteUrl,
    },
  });
}
