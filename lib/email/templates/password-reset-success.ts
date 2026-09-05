/**
 * Password reset success confirmation email.
 * SERVER-ONLY.
 */

import {
  renderEmailLayout,
  emailButton,
  escapeHtml,
  getSiteUrl,
} from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";

export interface PasswordResetSuccessEmailParams {
  to: string;
  name: string;
}

export async function sendPasswordResetSuccessEmail(
  params: PasswordResetSuccessEmailParams,
): Promise<void> {
  const siteUrl = getSiteUrl();

  await sendEmail({
    to: params.to,
    type: "password_reset_success",
    subject: "Your password has been changed — Trinomul Blood Bank",
    html: renderEmailLayout({
      title: "Password changed",
      accentColor: "#0f172a",
      accentBg: "#f8fafc",
      previewText: "Your password was successfully changed.",
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hi ${escapeHtml(params.name)},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">
          Your password was successfully changed. You can now sign in with your new password.
        </p>
        <div style="text-align:center;margin:0 0 16px;">
          ${emailButton(`${siteUrl}/login`, "Sign in", "#0f172a")}
        </div>
        <p style="margin:0;font-size:13px;color:#64748b;">
          <strong>Security tip:</strong> if you did not change your password, reset it immediately
          and contact our support team.
        </p>
      `,
      footerNote: "You received this email for account security confirmation.",
    }),
    text: `Your Trinomul Blood Bank password was changed. If this wasn't you, reset it immediately. ${siteUrl}/login`,
    // Placeholders available to admin template overrides.
    vars: { name: params.name, site_url: siteUrl },
  });
}
