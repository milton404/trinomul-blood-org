/**
 * Blood request alert email — sent to nearby eligible donors when a
 * blood request is posted. This is the core feature of the email system.
 * SERVER-ONLY.
 */

import {
  renderEmailLayout,
  emailButton,
  emailDetailRow,
  escapeHtml,
  getSiteUrl,
} from "@/lib/email/layout";
import { sendEmail } from "@/lib/email/send";
import type { DonorAlertRecipient } from "@/lib/email/recipients";

const URGENCY_STYLES: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  normal: { label: "Normal", bg: "#f1f5f9", color: "#475569" },
  urgent: { label: "Urgent", bg: "#fff7ed", color: "#c2410c" },
  critical: { label: "CRITICAL", bg: "#dc2626", color: "#ffffff" },
};

function formatWhenNeeded(req: Record<string, any>): string {
  const parts: string[] = [];
  if (req.when_needed) parts.push(String(req.when_needed));
  if (req.needed_date) parts.push(String(req.needed_date));
  if (req.needed_time) parts.push(String(req.needed_time));
  return parts.join(" · ") || "As soon as possible";
}

function formatLocation(req: Record<string, any>): string {
  const parts = [
    req.hospital_name,
    req.hospital_address,
    req.union_name,
    req.upazila,
    req.district,
  ].filter((p) => p && String(p).trim());
  return parts.join(", ") || "See request details";
}

export function renderBloodRequestAlertEmail(
  req: Record<string, any>,
  donorName: string,
  isSos = false,
): string {
  const siteUrl = getSiteUrl();
  const urgency =
    URGENCY_STYLES[req.urgency_level] || URGENCY_STYLES.normal;
  const trackUrl = req.tracking_code
    ? `${siteUrl}/track/${encodeURIComponent(req.tracking_code)}`
    : siteUrl;
  const mapUrl =
    req.lat && req.lng
      ? `https://www.google.com/maps?q=${req.lat},${req.lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(formatLocation(req))}`;
  const telUrl = req.contact_number
    ? `tel:${String(req.contact_number).replace(/[^\d+]/g, "")}`
    : null;

  const emergencyBanner = isSos
    ? `<div style="margin:0 0 18px;background:#dc2626;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.04em;">🚨 EMERGENCY SOS 🚨</div>
        <div style="font-size:13px;color:#fecaca;margin-top:4px;">A life is at risk right now — immediate blood needed</div>
      </div>`
    : `<div style="margin:0 0 18px;text-align:center;">
        <span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${urgency.bg};color:${urgency.color};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(urgency.label)} — blood request</span>
      </div>`;

  return renderEmailLayout({
    title: `Blood needed: ${req.blood_group} — ${req.patient_name}`,
    accentColor: "#dc2626",
    accentBg: "#fef2f2",
    previewText: `${isSos ? "🚨 EMERGENCY: " : ""}${req.blood_group} blood needed in ${req.upazila || req.district || "your area"} — can you help save a life?`,
    contentHtml: `
      ${emergencyBanner}
      <p style="margin:0 0 14px;font-size:15px;color:#334155;">Hi ${escapeHtml(donorName)}, a patient nearby needs blood that matches yours:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
        <tr>
          <td style="text-align:center;background:#fef2f2;border:2px solid #dc2626;border-radius:14px;padding:14px;">
            <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Blood group needed</div>
            <div style="font-size:42px;font-weight:800;color:#dc2626;line-height:1.2;">${escapeHtml(String(req.blood_group))}</div>
            <div style="font-size:13px;color:#64748b;">${escapeHtml(String(req.units_needed || 1))} unit(s) needed</div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;margin:0 0 18px;">
        <tr><td style="padding:10px 14px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${emailDetailRow("Patient", String(req.patient_name || "—"))}
            ${emailDetailRow("Location", formatLocation(req))}
            ${emailDetailRow("Needed", formatWhenNeeded(req))}
            ${telUrl ? emailDetailRow("Contact", String(req.contact_number)) : ""}
            ${req.reason ? emailDetailRow("Reason", String(req.reason)) : ""}
          </table>
        </td></tr>
        <tr><td style="padding:0 14px 12px;">
          <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">You received this email because you are an eligible donor near this location with a matching blood group.</p>
        </td></tr>
      </table>
      <p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong>If you can donate, please contact the requester directly:</strong></p>
      ${telUrl ? emailButton(telUrl, "📞 Call now") : ""}
      ${emailButton(mapUrl, "🗺️ View on map", "#0f172a")}
      ${emailButton(trackUrl, "🔗 Track request", "#2563eb")}
      <p style="margin:18px 0 0;font-size:14px;color:#334155;">
        Please share this with anyone nearby who can help. আপনার এক ব্যাগ রক্ত বাঁচাতে পারে একটি জীবন।
      </p>
    `,
    footerNote:
      "You received this because you are a registered donor near this request. You can turn off alert emails from your profile settings.",
  });
}

/** Send the alert email to one donor. Never throws. */
export async function sendBloodRequestAlertEmail(
  req: Record<string, any>,
  recipient: DonorAlertRecipient,
  isSos = false,
): Promise<boolean> {
  const name =
    recipient.full_name_en || recipient.full_name_bn || "Donor";
  const siteUrl = getSiteUrl();
  const trackUrl = req.tracking_code
    ? `${siteUrl}/track/${encodeURIComponent(req.tracking_code)}`
    : siteUrl;
  const mapUrl =
    req.lat && req.lng
      ? `https://www.google.com/maps?q=${req.lat},${req.lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(formatLocation(req))}`;

  const result = await sendEmail({
    to: recipient.email,
    type: isSos ? "blood_request_sos_alert" : "blood_request_alert",
    requestId: req.id ?? null,
    subject: isSos
      ? `🚨 EMERGENCY: ${req.blood_group} blood needed NOW in ${req.district || req.upazila || "your area"} — ${req.patient_name}`
      : `🩸 ${req.blood_group} blood needed in ${req.upazila || req.district || "your area"} — ${req.patient_name}`,
    html: renderBloodRequestAlertEmail(req, name, isSos),
    text: `${isSos ? "EMERGENCY: " : ""}${req.blood_group} blood needed for ${req.patient_name} at ${formatLocation(req)}. Contact: ${req.contact_number || "see website"}. ${formatWhenNeeded(req)}. ${siteUrl}`,
    // Placeholders available to admin template overrides.
    vars: {
      donor_name: name,
      patient_name: req.patient_name,
      blood_group: req.blood_group,
      units_needed: req.units_needed ?? 1,
      location: formatLocation(req),
      upazila: req.upazila,
      district: req.district,
      when_needed: formatWhenNeeded(req),
      contact_number: req.contact_number,
      reason: req.reason,
      track_url: trackUrl,
      map_url: mapUrl,
      site_url: siteUrl,
    },
  });
  return result.sent;
}
