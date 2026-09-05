import { describe, expect, it } from "vitest";
import { rankDonorCandidates } from "@/lib/donor-ranking";

describe("rankDonorCandidates", () => {
  const donors = [
    { id: 1, hbStatus: "eligible" as const, distanceKm: 20, baseScore: 100 },
    { id: 2, hbStatus: "not_tested" as const, distanceKm: 2, baseScore: 100 },
  ];

  it("prioritizes Hb-tested donors for normal requests", () => {
    expect(rankDonorCandidates(donors, "normal").map((donor) => donor.id)).toEqual([1, 2]);
  });

  it("prioritizes the nearest safe donor for urgent requests", () => {
    expect(rankDonorCandidates(donors, "urgent").map((donor) => donor.id)).toEqual([2, 1]);
    expect(rankDonorCandidates(donors, "critical").map((donor) => donor.id)).toEqual([2, 1]);
  });
});
