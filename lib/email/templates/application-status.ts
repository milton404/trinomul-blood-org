/**
 * Donor application decision emails: approved + rejected.
 * SERVER-ONLY.
 */

import {
  renderEmailLayout,
  emailButton,
  escapeHtml,
  getSiteUrl,
} from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";

// ── Approved ────────────────────────────────────────────────────────────

export interface ApplicationApprovedEmailParams {
  to: string;
  applicantName: string;
}

export async function sendApplicationApprovedEmail(
  params: ApplicationApprovedEmailParams,
): Promise<void> {
  const siteUrl = getSiteUrl();
  await sendEmail({
    to: params.to,
    type: "application_approved",
    subject:
      "You are approved — welcome to the Trinomul donor family! 🎉",
    html: renderEmailLayout({
      title: "Donor application approved",
      accentColor: "#059669",
      accentBg: "#ecfdf5",
      previewText:
        "Your donor application has been approved. You can now receive blood request alerts.",
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hi ${escapeHtml(params.applicantName || "Applicant")},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">
          Great news — your donor application has been <strong style="color:#059669;">approved</strong>.
          You are now a verified voluntary blood donor with Trinomul Blood Bank, Rangpur.
        </p>
        <div style="background:#ecfdf5;border-left:3px solid #059669;padding:14px 16px;border-radius:8px;margin:0 0 16px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#065f46;text-transform:uppercase;letter-spacing:0.05em;">What happens next</p>
          <ul style="margin:0;padding-left:18px;color:#065f46;font-size:14px;line-height:1.7;">
            <li>You may receive email alerts for nearby blood requests matching your blood group.</li>
            <li>Keep your profile location and phone number up to date so we can reach you.</li>
            <li>Donate when you can — every donation can save up to 3 lives.</li>
          </ul>
        </div>
        <p style="margin:0 0 8px;font-size:15px;color:#334155;">Thank you for joining the mission. রক্ত দিন, জীবন বাঁচান!</p>
        ${emailButton(`${siteUrl}/donors`, "View donors", "#059669")}
        ${emailButton(siteUrl, "Visit website", "#0f172a")}
      `,
      footerNote:
        "You received this email because you applied to become a blood donor.",
    }),
    text: `Hi ${params.applicantName || "Applicant"}, your donor application has been approved. Welcome to the Trinomul Blood Bank donor family! ${siteUrl}`,
    // Placeholders available to admin template overrides.
    vars: { name: params.applicantName, site_url: siteUrl },
  });
}

// ── Rejected (migrated from the original lib/email.ts template) ─────────

export interface DonorApplicationRejectedEmailParams {
  to: string;
  applicantName: string;
  note: string;
}

export async function sendDonorApplicationRejectedEmail(
  params: DonorApplicationRejectedEmailParams,
): Promise<void> {
  const siteUrl = getSiteUrl();
  await sendEmail({
    to: params.to,
    type: "application_rejected",
    subject: "Update on your donor application — Trinomul Blood Bank",
    html: renderEmailLayout({
      title: "Donor application update",
      accentColor: "#dc2626",
      accentBg: "#fef2f2",
      previewText: "An update on your donor application.",
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hi ${escapeHtml(params.applicantName || "Applicant")},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">
          Thank you for applying to become a donor. After reviewing your application,
          our admin team was unable to approve it at this time.
        </p>
        <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:14px 16px;border-radius:8px;margin:0 0 16px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#991b1b;text-transform:uppercase;letter-spacing:0.05em;">Reason</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;white-space:pre-wrap;">${escapeHtml(params.note)}</p>
        </div>
        <p style="margin:0 0 8px;font-size:15px;color:#334155;">
          If you believe this is a mistake or you would like to update your information,
          you may reapply with corrected details.
        </p>
        ${emailButton(siteUrl, "Visit Trinomul Blood Bank")}
      `,
      footerNote:
        "You received this email because you applied to become a blood donor.",
    }),
    text: `Hi ${params.applicantName || "Applicant"}, unfortunately your donor application was not approved. Reason: ${params.note}. ${siteUrl}`,
    // Placeholders available to admin template overrides.
    vars: { name: params.applicantName, site_url: siteUrl },
  });
}
