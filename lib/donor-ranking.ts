export type HbStatus = "eligible" | "not_tested";

export interface DonorCandidate {
  id: number;
  hbStatus: HbStatus;
  distanceKm: number | null;
  baseScore: number;
}

export function rankDonorCandidates<T extends DonorCandidate>(
  donors: T[],
  urgencyLevel: string,
): T[] {
  return [...donors].sort((a, b) => {
    const isUrgent = urgencyLevel === "urgent" || urgencyLevel === "critical";
    if (isUrgent && a.distanceKm !== b.distanceKm) {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    }

    if (!isUrgent && a.hbStatus !== b.hbStatus) {
      return a.hbStatus === "eligible" ? -1 : 1;
    }

    if (a.baseScore !== b.baseScore) {
      return b.baseScore - a.baseScore;
    }

    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}
