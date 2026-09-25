import { DONATION_TYPES, type DonationType } from "@/lib/db";

export function cooldownDaysFor(type: string): number {
  const t = (type || "whole_blood") as DonationType;
  return DONATION_TYPES[t]?.cooldown_days ?? 90;
}

export function eligibleAt(donationDate: string, type: string): Date {
  const d = new Date(`${donationDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return new Date();
  d.setUTCDate(d.getUTCDate() + cooldownDaysFor(type));
  return d;
}