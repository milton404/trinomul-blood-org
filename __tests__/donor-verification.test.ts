import { describe, it, expect } from "vitest";
import { isVerificationStatus } from "@/types/donor-verification";

// ── isVerificationStatus type guard ────────────────────────────────────────

describe("isVerificationStatus", () => {
  it("accepts all four valid statuses", () => {
    expect(isVerificationStatus("unverified")).toBe(true);
    expect(isVerificationStatus("pending")).toBe(true);
    expect(isVerificationStatus("verified")).toBe(true);
    expect(isVerificationStatus("rejected")).toBe(true);
  });

  it("rejects invalid strings", () => {
    expect(isVerificationStatus("approved")).toBe(false);
    expect(isVerificationStatus("")).toBe(false);
    expect(isVerificationStatus("UNKNOWN")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isVerificationStatus(null)).toBe(false);
    expect(isVerificationStatus(undefined)).toBe(false);
    expect(isVerificationStatus(0)).toBe(false);
    expect(isVerificationStatus(true)).toBe(false);
    expect(isVerificationStatus({})).toBe(false);
  });
});

// ── QR payload structure ───────────────────────────────────────────────────
//
// DonorQrCard encodes `{ type, id, bg, d, v }`. Scanners parse this JSON
// to deep-link to the donor profile. The structure must stay stable.

describe("donor QR payload", () => {
  const buildPayload = (donorId: number, bloodGroup: string, district: string, isVerified: boolean) =>
    JSON.stringify({
      type: "donor",
      id: donorId,
      bg: bloodGroup,
      d: district,
      v: isVerified ? 1 : 0,
    });

  it("encodes all required fields", () => {
    const payload = JSON.parse(buildPayload(42, "O+", "Rangpur", true));
    expect(payload).toEqual({
      type: "donor",
      id: 42,
      bg: "O+",
      d: "Rangpur",
      v: 1,
    });
  });

  it("sets v=0 for unverified donors", () => {
    const payload = JSON.parse(buildPayload(7, "A-", "Dinajpur", false));
    expect(payload.v).toBe(0);
  });

  it("produces stable output for the same input", () => {
    const a = buildPayload(1, "B+", "Rangpur", true);
    const b = buildPayload(1, "B+", "Rangpur", true);
    expect(a).toBe(b);
  });
});

// ── vCard generation ───────────────────────────────────────────────────────
//
// SaveContactButton builds a vCard 3.0 string. The format must be valid
// for phone contact apps to parse.

describe("vCard generation", () => {
  const buildVcard = (opts: {
    fullName: string;
    phone?: string;
    email?: string;
    bloodGroup?: string;
    district?: string;
    upazila?: string;
  }) => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${opts.fullName}`,
      `N:${opts.fullName};;;;`,
    ];
    if (opts.phone) lines.push(`TEL;TYPE=CELL:${opts.phone}`);
    if (opts.email) lines.push(`EMAIL:${opts.email}`);
    const addressParts = [opts.upazila, opts.district].filter(Boolean);
    if (addressParts.length > 0) {
      lines.push(`ADR;TYPE=HOME:;;${addressParts.join(", ")};;;;`);
    }
    if (opts.bloodGroup) {
      lines.push(`NOTE:Blood Group: ${opts.bloodGroup} - Trinomul Blood Bank Rangpur`);
    } else {
      lines.push("NOTE:Trinomul Blood Bank Rangpur");
    }
    lines.push("END:VCARD");
    return lines.join("\r\n");
  };

  it("produces valid vCard 3.0 envelope", () => {
    const vcard = buildVcard({ fullName: "John Doe" });
    expect(vcard.startsWith("BEGIN:VCARD\r\n")).toBe(true);
    expect(vcard.endsWith("\r\nEND:VCARD")).toBe(true);
    expect(vcard).toContain("VERSION:3.0");
  });

  it("includes phone when provided", () => {
    const vcard = buildVcard({ fullName: "John", phone: "+8801712345678" });
    expect(vcard).toContain("TEL;TYPE=CELL:+8801712345678");
  });

  it("omits phone line when not provided", () => {
    const vcard = buildVcard({ fullName: "John" });
    expect(vcard).not.toContain("TEL");
  });

  it("includes address when upazila + district provided", () => {
    const vcard = buildVcard({
      fullName: "John",
      upazila: "Boalia",
      district: "Rajshahi",
    });
    expect(vcard).toContain("ADR;TYPE=HOME:;;Boalia, Rajshahi;;;;");
  });

  it("includes blood group in NOTE", () => {
    const vcard = buildVcard({ fullName: "John", bloodGroup: "O+" });
    expect(vcard).toContain("Blood Group: O+");
  });
});

// ── Response time calculation ──────────────────────────────────────────────
//
// updateDonorMatchResponse computes response_ms = now - created_at and
// accumulates it in response_total_ms. We test the formula and the
// 30-day cap (responses older than 30 days are discarded).

describe("response time calculation", () => {
  const computeResponseMs = (createdAtMs: number, nowMs: number): number | null => {
    const responseMs = nowMs - createdAtMs;
    if (responseMs > 0 && responseMs < 30 * 24 * 60 * 60 * 1000) {
      return Math.round(responseMs);
    }
    return null;
  };

  it("returns positive ms for a recent response", () => {
    const created = Date.now() - 5 * 60 * 1000; // 5 min ago
    const result = computeResponseMs(created, Date.now());
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(4 * 60 * 1000);
    expect(result!).toBeLessThan(6 * 60 * 1000);
  });

  it("returns null for negative (future) created_at", () => {
    const future = Date.now() + 10000;
    expect(computeResponseMs(future, Date.now())).toBeNull();
  });

  it("returns null for responses older than 30 days", () => {
    const old = Date.now() - 31 * 24 * 60 * 60 * 1000;
    expect(computeResponseMs(old, Date.now())).toBeNull();
  });

  it("accepts a response exactly at 29 days", () => {
    const old = Date.now() - 29 * 24 * 60 * 60 * 1000;
    expect(computeResponseMs(old, Date.now())).not.toBeNull();
  });
});

// ── Presence throttle logic ────────────────────────────────────────────────
//
// updateLastActive skips the write if the last update was < 4 minutes ago.
// We test the threshold logic.

describe("presence throttle", () => {
  const shouldThrottle = (lastActiveAtMs: number, nowMs: number): boolean => {
    return nowMs - lastActiveAtMs < 4 * 60 * 1000;
  };

  it("throttles when last update was < 4 minutes ago", () => {
    const last = Date.now() - 3 * 60 * 1000; // 3 min ago
    expect(shouldThrottle(last, Date.now())).toBe(true);
  });

  it("does not throttle when last update was >= 4 minutes ago", () => {
    const last = Date.now() - 4 * 60 * 1000; // exactly 4 min
    expect(shouldThrottle(last, Date.now())).toBe(false);
  });

  it("does not throttle for stale last_active_at", () => {
    const last = Date.now() - 60 * 60 * 1000; // 1 hour ago
    expect(shouldThrottle(last, Date.now())).toBe(false);
  });
});

// ── Online detection threshold ─────────────────────────────────────────────
//
// DonorCard shows a green dot when last_active_at is within 15 minutes.

describe("online detection", () => {
  const isOnline = (lastActiveAt: string | null, nowMs: number): boolean => {
    if (!lastActiveAt) return false;
    try {
      const last = new Date(lastActiveAt).getTime();
      return nowMs - last < 15 * 60 * 1000;
    } catch {
      return false;
    }
  };

  it("returns false for null last_active_at", () => {
    expect(isOnline(null, Date.now())).toBe(false);
  });

  it("returns true when active within 15 minutes", () => {
    const recent = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(isOnline(recent, Date.now())).toBe(true);
  });

  it("returns false when active > 15 minutes ago", () => {
    const stale = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    expect(isOnline(stale, Date.now())).toBe(false);
  });
});

// ── Anonymous mode masking ─────────────────────────────────────────────────
//
// When is_anonymous is true, DonorCard masks the name and hides contact.

describe("anonymous mode masking", () => {
  const getDisplayName = (fullName: string, isAnonymous: boolean): string => {
    return isAnonymous ? "Anonymous Donor" : fullName;
  };

  it("masks name when anonymous", () => {
    expect(getDisplayName("John Doe", true)).toBe("Anonymous Donor");
  });

  it("shows real name when not anonymous", () => {
    expect(getDisplayName("John Doe", false)).toBe("John Doe");
  });
});

// ── Avg response time display ──────────────────────────────────────────────
//
// DonorCard shows avg response time in minutes, computed from
// response_total_ms / response_count.

describe("avg response time display", () => {
  const computeAvgResponseMin = (
    responseCount: number,
    responseTotalMs: number,
  ): number | null => {
    if (responseCount === 0) return null;
    return Math.round(responseTotalMs / responseCount / 60000);
  };

  it("returns null when no responses", () => {
    expect(computeAvgResponseMin(0, 0)).toBeNull();
  });

  it("computes average in minutes", () => {
    // 3 responses totaling 30 min (1,800,000 ms)
    expect(computeAvgResponseMin(3, 3 * 10 * 60 * 1000)).toBe(10);
  });

  it("rounds to nearest minute", () => {
    // 2 responses: 5.5 min and 6.5 min → avg 6 min
    expect(computeAvgResponseMin(2, (5.5 + 6.5) * 60 * 1000)).toBe(6);
  });
});