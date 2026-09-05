/**
 * Welcome email — sent after a new account is registered.
 * SERVER-ONLY.
 */

import {
  renderEmailLayout,
  emailButton,
  escapeHtml,
  getSiteUrl,
} from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";

export interface WelcomeEmailParams {
  to: string;
  name: string;
  role?: string;
}

export async function sendWelcomeEmail(
  params: WelcomeEmailParams,
): Promise<void> {
  const siteUrl = getSiteUrl();
  const isDonor = params.role === "donor";

  await sendEmail({
    to: params.to,
    type: "welcome",
    subject: "Welcome to Trinomul Blood Bank! 🩸",
    html: renderEmailLayout({
      title: "Welcome",
      accentColor: "#059669",
      accentBg: "#ecfdf5",
      previewText: "Welcome to Trinomul Blood Bank — join the life-saving mission.",
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hi ${escapeHtml(params.name)},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">
          Welcome to <strong>Trinomul Blood Bank, Rangpur</strong> — a community of voluntary
          blood donors working to make sure no patient in Rangpur waits for blood alone.
        </p>
        <div style="background:#ecfdf5;border-left:3px solid #059669;padding:14px 16px;border-radius:8px;margin:0 0 16px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#065f46;text-transform:uppercase;letter-spacing:0.05em;">Get started</p>
          <ul style="margin:0;padding-left:18px;color:#065f46;font-size:14px;line-height:1.7;">
            <li>Complete your profile — add your blood group and location so we can match you with nearby patients.</li>
            ${isDonor ? "<li>Stay eligible — keep your donation history and last donation date up to date.</li>" : "<li>Post a blood request when you or a family member needs blood — nearby donors will be alerted instantly.</li>"}
            <li>Track every request with a unique tracking code and share it with family and friends.</li>
          </ul>
        </div>
        <p style="margin:0 0 8px;font-size:15px;color:#334155;">রক্ত দিন, জীবন বাঁচান — give blood, save lives.</p>
        ${emailButton(`${siteUrl}/profile`, "Complete my profile", "#059669")}
        ${emailButton(`${siteUrl}/about`, "Learn more", "#0f172a")}
      `,
      footerNote: "You received this email because you created an account.",
    }),
    text: `Welcome to Trinomul Blood Bank, Rangpur! Complete your profile at ${siteUrl}/profile.`,
    // Placeholders available to admin template overrides.
    vars: { name: params.name, site_url: siteUrl },
  });
}
