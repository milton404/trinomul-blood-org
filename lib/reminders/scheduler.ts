import { query as pgQuery } from "@/lib/supabase/client";
import { cooldownDaysFor, eligibleAt } from "./cooldown";

/**
 * Schedule a recurring donation reminder for when the donor's cooldown expires.
 * Also supersedes any older pending reminder for the same donor (they donated
 * again before the previous cooldown elapsed — a stale reminder would mislead).
 */
export async function scheduleDonationReminderPg(params: {
  donationId: number;
  donorId: number;
  donationType: string;
  donationDate: string;
}): Promise<void> {
  const { donationId, donorId, donationType, donationDate } = params;
  const eligible = eligibleAt(donationDate, donationType);
  await pgQuery(
    `INSERT INTO donation_reminders (donation_id, donor_id, donation_type, eligible_at, status)
     VALUES ($1, $2, $3, $4, 'scheduled')
     ON CONFLICT DO NOTHING`,
    [donationId, donorId, donationType, eligible.toISOString()],
  );
  await supersedePendingRemindersPg(donorId, donationId);
}

/** Mark a donor's older scheduled reminders as superseded (new donation recorded). */
export async function supersedePendingRemindersPg(
  donorId: number,
  keepDonationId?: number,
): Promise<number> {
  const { rowCount } = await pgQuery(
    `UPDATE donation_reminders
     SET status = 'superseded', cancelled_reason = 'new_donation'
     WHERE donor_id = $1 AND status = 'scheduled'
       AND ($2::bigint IS NULL OR donation_id <> $2)`,
    [donorId, keepDonationId ?? null],
  );
  return rowCount ?? 0;
}

/**
 * Send all due donation reminders (eligible_at <= now, status='scheduled').
 * Delivers an in-app notification per reminder and marks it sent. Email + web
 * push channels can be layered in here later without changing the schema.
 */
export async function sendDueDonationRemindersPg(): Promise<{
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const { rows } = await pgQuery<{
    id: number;
    donor_id: number;
    donation_id: number;
    donation_type: string;
  }>(
    `SELECT id, donor_id, donation_id, donation_type
     FROM donation_reminders
     WHERE status = 'scheduled' AND eligible_at <= NOW()
     ORDER BY eligible_at ASC
     LIMIT 200`,
  );

  let sent = 0;
  for (const r of rows) {
    try {
      const cooldown = cooldownDaysFor(r.donation_type);
      const label = r.donation_type.replace(/_/g, " ");
      const content = `You are eligible to donate again (${label}, ${cooldown}-day cooldown complete). Thank you for saving lives!`;
      await pgQuery(
        `INSERT INTO notifications (user_id, actor_id, type, post_id, content)
         VALUES ($1, NULL, 'donation_reminder', NULL, $2)`,
        [r.donor_id, content],
      );
      await pgQuery(
        `UPDATE donation_reminders
         SET status = 'sent', sent_at = NOW(), channel = 'in_app'
         WHERE id = $1`,
        [r.id],
      );
      sent++;
    } catch (e) {
      errors.push(`reminder ${r.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { sent, errors };
}

/** Cancel pending reminders for a donation that was reversed/soft-deleted. */
export async function cancelRemindersForDonationPg(
  donationId: number,
  reason = "donation_reversed",
): Promise<number> {
  const { rowCount } = await pgQuery(
    `UPDATE donation_reminders
     SET status = 'cancelled', cancelled_reason = $2
     WHERE donation_id = $1 AND status = 'scheduled'`,
    [donationId, reason],
  );
  return rowCount ?? 0;
}