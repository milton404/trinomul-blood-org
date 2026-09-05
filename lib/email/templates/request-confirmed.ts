/**
 * Request confirmation email — sent to the requester when their blood
 * request is posted (tracking code + what happens next).
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

export interface RequestConfirmedEmailParams {
  to: string;
  requesterName: string;
  request: Record<string, any>;
}

export async function sendRequestConfirmedEmail(
  params: RequestConfirmedEmailParams,
): Promise<void> {
  const siteUrl = getSiteUrl();
  const req = params.request;
  const trackingCode = req.tracking_code
    ? String(req.tracking_code)
    : `REQ #${req.id}`;
  const trackUrl = req.tracking_code
    ? `${siteUrl}/track/${encodeURIComponent(req.tracking_code)}`
    : siteUrl;

  await sendEmail({
    to: params.to,
    type: "request_confirmed",
    requestId: req.id ?? null,
    subject: `Blood request received — tracking code ${trackingCode}`,
    html: renderEmailLayout({
      title: "Blood request confirmed",
      accentColor: "#2563eb",
      accentBg: "#eff6ff",
      previewText: `Your blood request has been posted. Tracking code: ${trackingCode}`,
      contentHtml: `
        <p style="margin:0 0 12px;font-size:15px;color:#334155;">Hi ${escapeHtml(params.requesterName)},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#334155;">
          Your blood request has been posted and nearby eligible donors with a matching
          blood group have been alerted. Keep your phone reachable — donors may call you directly.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;margin:0 0 16px;">
          <tr><td style="padding:10px 14px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${emailDetailRow("Tracking code", trackingCode, { strong: true, mono: true })}
              ${emailDetailRow("Patient", String(req.patient_name || "—"))}
              ${emailDetailRow("Blood group", String(req.blood_group), { strong: true })}
              ${emailDetailRow("Units", String(req.units_needed || 1))}
              ${emailDetailRow("Hospital", String(req.hospital_name || "—"))}
              ${emailDetailRow("Location", [req.upazila, req.district].filter(Boolean).join(", ") || "—")}
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 12px;font-size:14px;color:#475569;">
          Share your tracking link with family and friends so they can follow the request status:
        </p>
        ${emailButton(trackUrl, "🔗 Track your request", "#2563eb")}
        ${emailButton(`${siteUrl}/requests`, "Browse all requests", "#0f172a")}
        <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">
          If your request is fulfilled or no longer needed, please mark it as fulfilled so donors stop being alerted.
        </p>
      `,
      footerNote: "You received this email because you posted a blood request.",
    }),
    text: `Your blood request for ${req.blood_group} (${req.patient_name}) has been posted. Tracking code: ${trackingCode}. Track it here: ${trackUrl}`,
    // Placeholders available to admin template overrides.
    vars: {
      requester_name: params.requesterName,
      patient_name: req.patient_name,
      blood_group: req.blood_group,
      units_needed: req.units_needed ?? 1,
      hospital_name: req.hospital_name,
      tracking_code: trackingCode,
      track_url: trackUrl,
      site_url: siteUrl,
    },
  });
}
