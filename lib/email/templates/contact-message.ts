/**
 * Contact-form submission email — sent to the org inbox when a visitor
 * submits the public contact form. SERVER-ONLY.
 */

import {
  renderEmailLayout,
  emailDetailRow,
  escapeHtml,
  getSiteUrl,
} from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";

export function renderContactMessageEmail(msg: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}): string {
  const siteUrl = getSiteUrl();
  const replyUrl = `mailto:${encodeURIComponent(msg.email)}`;

  return renderEmailLayout({
    title: `Contact form: ${msg.subject || "New message"}`,
    accentColor: "#0f172a",
    accentBg: "#f1f5f9",
    previewText: `New contact message from ${msg.name}`,
    contentHtml: `
      <p style="margin:0 0 14px;font-size:15px;color:#334155;">
        Someone sent a message through the website contact form:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;margin:0 0 18px;">
        <tr><td style="padding:10px 14px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow("Name", msg.name)}
            ${emailDetailRow("Email", msg.email)}
            ${msg.phone ? emailDetailRow("Phone", msg.phone) : ""}
            ${msg.subject ? emailDetailRow("Subject", msg.subject) : ""}
          </table>
        </td></tr>
        <tr><td style="padding:12px 14px;">
          <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Message</p>
          <p style="margin:6px 0 0;font-size:14px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(msg.message)}</p>
        </td></tr>
      </table>
      <a href="${escapeHtml(replyUrl)}" style="display:inline-block;padding:11px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Reply by email</a>
      <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">
        View and manage all messages in the admin panel: ${escapeHtml(siteUrl)}/admin/contact-messages
      </p>
    `,
    footerNote:
      "You received this because a visitor submitted the contact form on the website.",
  });
}

/** Send the contact notification to the org inbox. Never throws. */
export async function sendContactMessageEmail(
  msg: {
    name: string;
    email: string;
    phone?: string | null;
    subject?: string | null;
    message: string;
  },
  orgInbox: string,
): Promise<boolean> {
  const result = await sendEmail({
    to: orgInbox,
    type: "contact_message",
    subject: `Contact form: ${msg.subject || "New message"} — ${msg.name}`,
    html: renderContactMessageEmail(msg),
    text: `New contact message from ${msg.name} <${msg.email}>${msg.phone ? ` (phone: ${msg.phone})` : ""}\nSubject: ${msg.subject || "—"}\n\n${msg.message}`,
    vars: {
      name: msg.name,
      email: msg.email,
      phone: msg.phone,
      subject: msg.subject,
      message: msg.message,
    },
  });
  return result.sent;
}