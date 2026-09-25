export type Tier = "bronze" | "silver" | "gold" | "platinum";

export const TIER_THRESHOLDS: { tier: Tier; min: number; label_bn: string; label_en: string }[] = [
  { tier: "bronze", min: 0, label_bn: "ব্রোঞ্জ", label_en: "Bronze" },
  { tier: "silver", min: 500, label_bn: "রৌপ্য", label_en: "Silver" },
  { tier: "gold", min: 1500, label_bn: "স্বর্ণ", label_en: "Gold" },
  { tier: "platinum", min: 3000, label_bn: "প্লাটিনাম", label_en: "Platinum" },
];

export function computeTier(lifetimePoints: number): Tier {
  if (lifetimePoints >= 3000) return "platinum";
  if (lifetimePoints >= 1500) return "gold";
  if (lifetimePoints >= 500) return "silver";
  return "bronze";
}

export function tierInfo(lifetimePoints: number) {
  const tier = computeTier(lifetimePoints);
  return TIER_THRESHOLDS.find((t) => t.tier === tier)!;
}