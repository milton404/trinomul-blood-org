import { query as pgQuery } from "@/lib/supabase/client";
import { computeTier } from "./tiers";

export type DonorPoints = {
  donor_id: number;
  total_points: number;
  lifetime_points: number;
  tier: string;
};

export type PointTransaction = {
  id: number;
  donor_id: number;
  donation_id: number | null;
  points: number;
  reason: string;
  note: string | null;
  created_at: string;
};

const DEFAULT_POINTS: Record<string, number> = {
  whole_blood: 100,
  platelets: 150,
  plasma: 120,
};

async function getPointsConfigPg(): Promise<Record<string, number>> {
  try {
    const { rows } = await pgQuery<{ key: string; value: string }>(
      `SELECT key, value FROM site_settings
       WHERE key IN ('points_whole_blood','points_platelets','points_plasma','points_first_donation_bonus','points_emergency_response','points_referral')`,
    );
    const cfg = { ...DEFAULT_POINTS };
    for (const r of rows) {
      const map: Record<string, string> = {
        points_whole_blood: "whole_blood",
        points_platelets: "platelets",
        points_plasma: "plasma",
      };
      const k = map[r.key];
      if (k) cfg[k] = Number(r.value) || cfg[k];
    }
    return cfg;
  } catch {
    return DEFAULT_POINTS;
  }
}

/**
 * Award points for a donation. Appends a point_transaction and upserts
 * donor_points. Includes a first-donation bonus when applicable. Idempotent —
 * if points were already awarded for this donation, returns without changes.
 */
export async function awardPointsForDonationPg(
  donationId: number,
  donorId: number,
  donationType: string,
): Promise<number> {
  const { rows: existing } = await pgQuery(
    `SELECT id FROM point_transactions WHERE donation_id = $1 AND reason = 'donation'`,
    [donationId],
  );
  if (existing.length > 0) return 0;

  const cfg = await getPointsConfigPg();
  const points = cfg[donationType] ?? cfg.whole_blood;

  const { rows: countRows } = await pgQuery<{ cnt: string }>(
    `SELECT COUNT(*)::TEXT AS cnt FROM donations WHERE donor_id = $1`,
    [donorId],
  );
  const isFirst = Number(countRows[0]?.cnt ?? 0) <= 1;
  const bonus = isFirst ? 50 : 0;
  const total = points + bonus;

  await pgQuery(
    `INSERT INTO point_transactions (donor_id, donation_id, points, reason, note)
     VALUES ($1, $2, $3, 'donation', $4)`,
    [donorId, donationId, total, isFirst ? "Donation + first-donation bonus" : "Donation"],
  );

  const { rows: cur } = await pgQuery<{ total_points: number; lifetime_points: number }>(
    `SELECT total_points, lifetime_points FROM donor_points WHERE donor_id = $1`,
    [donorId],
  );
  const newTotal = (cur[0]?.total_points ?? 0) + total;
  const newLifetime = (cur[0]?.lifetime_points ?? 0) + total;
  const tier = computeTier(newLifetime);

  await pgQuery(
    `INSERT INTO donor_points (donor_id, total_points, lifetime_points, tier, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (donor_id) DO UPDATE
       SET total_points = $2, lifetime_points = $3, tier = $4, updated_at = NOW()`,
    [donorId, newTotal, newLifetime, tier],
  );

  return total;
}

/**
 * Reverse points for a donation (append a negative transaction). Never deletes
 * the original — ledger pattern for audit.
 */
export async function reversePointsForDonationPg(
  donationId: number,
  donorId: number,
): Promise<number> {
  const { rows } = await pgQuery<{ id: number; points: number }>(
    `SELECT id, points FROM point_transactions
     WHERE donation_id = $1 AND reason = 'donation' AND points > 0`,
    [donationId],
  );
  if (rows.length === 0) return 0;
  const original = rows[0];
  const negate = -original.points;

  await pgQuery(
    `INSERT INTO point_transactions (donor_id, donation_id, points, reason, reference_id, note)
     VALUES ($1, $2, $3, 'donation_reversed', $4, 'Reversal of original award')`,
    [donorId, donationId, negate, original.id],
  );

  const { rows: cur } = await pgQuery<{ total_points: number; lifetime_points: number }>(
    `SELECT total_points, lifetime_points FROM donor_points WHERE donor_id = $1`,
    [donorId],
  );
  const newTotal = Math.max(0, (cur[0]?.total_points ?? 0) + negate);
  const newLifetime = (cur[0]?.lifetime_points ?? 0) + negate;
  const tier = computeTier(newLifetime);

  await pgQuery(
    `UPDATE donor_points SET total_points = $2, lifetime_points = $3, tier = $4, updated_at = NOW()
     WHERE donor_id = $1`,
    [donorId, newTotal, newLifetime, tier],
  );

  return negate;
}

export async function getDonorPointsPg(donorId: number): Promise<DonorPoints | null> {
  const { rows } = await pgQuery<DonorPoints>(
    `SELECT donor_id, total_points, lifetime_points, tier FROM donor_points WHERE donor_id = $1`,
    [donorId],
  );
  return rows[0] ?? null;
}

export async function getDonorPointTransactionsPg(
  donorId: number,
  limit = 50,
): Promise<PointTransaction[]> {
  const { rows } = await pgQuery<PointTransaction>(
    `SELECT id, donor_id, donation_id, points, reason, note, created_at
     FROM point_transactions WHERE donor_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [donorId, limit],
  );
  return rows;
}

export type Reward = {
  id: number;
  name_bn: string;
  name_en: string;
  desc_bn: string | null;
  desc_en: string | null;
  points_cost: number;
  category: string;
  stock: number;
  active: boolean;
  image_url: string | null;
};

export async function getActiveRewardsPg(): Promise<Reward[]> {
  const { rows } = await pgQuery<Reward>(
    `SELECT id, name_bn, name_en, desc_bn, desc_en, points_cost, category, stock, active, image_url
     FROM rewards WHERE active = TRUE ORDER BY points_cost ASC`,
  );
  return rows;
}

export async function redeemRewardPg(
  donorId: number,
  rewardId: number,
): Promise<{ ok: boolean; error?: string; redemptionId?: number }> {
  const { rows: rewardRows } = await pgQuery<Reward>(
    `SELECT id, points_cost, stock, active FROM rewards WHERE id = $1`,
    [rewardId],
  );
  const reward = rewardRows[0];
  if (!reward) return { ok: false, error: "Reward not found" };
  if (!reward.active) return { ok: false, error: "Reward is no longer available" };
  if (reward.stock !== -1 && reward.stock <= 0) {
    return { ok: false, error: "Reward out of stock" };
  }

  const points = await getDonorPointsPg(donorId);
  const balance = points?.total_points ?? 0;
  if (balance < reward.points_cost) {
    return { ok: false, error: `Need ${reward.points_cost} points, you have ${balance}` };
  }

  const { rows: ins } = await pgQuery<{ id: number }>(
    `INSERT INTO reward_redemptions (donor_id, reward_id, points_spent, status)
     VALUES ($1, $2, $3, 'pending') RETURNING id`,
    [donorId, rewardId, reward.points_cost],
  );
  const redemptionId = ins[0].id;

  await pgQuery(
    `INSERT INTO point_transactions (donor_id, points, reason, reference_id, note)
     VALUES ($1, $2, 'redemption', $3, 'Reward redemption')`,
    [donorId, -reward.points_cost, redemptionId],
  );

  const newTotal = balance - reward.points_cost;
  await pgQuery(
    `UPDATE donor_points SET total_points = $2, updated_at = NOW() WHERE donor_id = $1`,
    [donorId, newTotal],
  );

  if (reward.stock !== -1) {
    await pgQuery(`UPDATE rewards SET stock = stock - 1 WHERE id = $1`, [rewardId]);
  }

  return { ok: true, redemptionId };
}