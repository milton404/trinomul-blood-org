/**
 * Blood request email dispatch — glue between request creation and the
 * donor alert + requester confirmation emails.
 *
 * Fired as a background job from serverCreateBloodRequest() (setTimeout,
 * same pattern as the BN-translation job). Never throws.
 *
 * SERVER-ONLY.
 */

import {
  getBloodRequestById,
  recordDonorMatches,
  getProfileByUserId,
} from "@/lib/db";
import { createLogger } from "@/lib/logging/logger";
import {
  getEmailAlertRecipients,
  getSosAlertRecipients,
} from "@/lib/email/recipients";
import { sendBloodRequestAlertEmail } from "@/lib/email/templates/blood-request-alert";
import { sendRequestConfirmedEmail } from "@/lib/email/templates/request-confirmed";
import type { DonorMatch } from "@/lib/db";

const logger = createLogger("email");

export interface DispatchOptions {
  /**
   * Emergency SOS mode: recipients are ALL eligible same-blood-group donors
   * in the same upazila + district (cap 40), emails carry the emergency
   * banner, and donor_matches are recorded with notification_method =
   * 'email_sos' so the admin panel can distinguish them.
   */
  sos?: boolean;
}

/**
 * Select recipients, send alert emails, record donor_matches rows with
 * notification_method = 'email' / 'email_sos' (so the admin Donor Match
 * panel tracks email-notified donors too), and email the requester a
 * confirmation with their tracking code.
 */
export async function dispatchBloodRequestEmails(
  requestId: number,
  method: string = "email",
  options: DispatchOptions = {},
): Promise<void> {
  const sos = options.sos === true;
  try {
    const req = getBloodRequestById(requestId) as Record<string, any> | undefined;
    if (!req) return;
    // Only alert for live requests.
    if (req.status && req.status !== "active") return;

    // 1. Donor alert emails.
    const recipients = sos
      ? getSosAlertRecipients(
          req as Parameters<typeof getSosAlertRecipients>[0],
        )
      : getEmailAlertRecipients(
          req as Parameters<typeof getEmailAlertRecipients>[0],
        );
    if (recipients.length > 0) {
      const sentTo: DonorAlertSent[] = [];
      for (const r of recipients) {
        const sent = await sendBloodRequestAlertEmail(req, r, sos);
        if (sent) sentTo.push(r);
      }
      if (sentTo.length > 0) {
        recordDonorMatches(
          requestId,
          sentTo as unknown as DonorMatch[],
          method,
        );
      }
      logger.info(
        sos
          ? "Emergency SOS alert emails dispatched"
          : "Blood request alert emails dispatched",
        {
          requestId: String(requestId),
          selected: recipients.length,
          sent: sentTo.length,
        },
      );
    }

    // 2. Confirmation email to the requester (tracking code + link).
    if (req.requester_id) {
      try {
        const profile = (await getProfileByUserId(
          req.requester_id,
        )) as Record<string, any> | undefined;
        if (profile?.email) {
          await sendRequestConfirmedEmail({
            to: profile.email,
            requesterName:
              profile.full_name_en || profile.full_name_bn || "Requester",
            request: req,
          });
        }
      } catch (e) {
        logger.warn("Requester confirmation email failed", {
          requestId: String(requestId),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } catch (e) {
    // Background job — never let it crash the server.
    logger.error("dispatchBloodRequestEmails failed", {
      requestId: String(requestId),
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

interface DonorAlertSent {
  id: number;
  match_rank: number;
  match_score: number;
}
