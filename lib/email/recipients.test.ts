/**
 * Unit tests for the donor alert email recipient selection rules
 * (docs/EMAIL-SYSTEM-PLAN.md §2). Uses the pure selection function with
 * the DB layer mocked out.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: () => {
    throw new Error("getDb must not be called by the pure selection function");
  },
}));

import {
  selectDonorAlertRecipientsFromDonors,
  selectSosAlertRecipientsFromDonors,
  isRangpurCoreRequest,
  MAX_EMAIL_RECIPIENTS,
  MAX_SOS_EMAIL_RECIPIENTS,
  type EmailDonorRow,
} from "@/lib/email/recipients";

const RANGPUR_SADAR = { lat: 25.7439, lng: 89.2752 };

function donor(partial: Partial<EmailDonorRow> & { id: number }): EmailDonorRow {
  return {
    email: `donor${partial.id}@example.com`,
    full_name_en: `Donor ${partial.id}`,
    full_name_bn: null,
    blood_group: "O+",
    district: "Rangpur",
    upazila: "Rangpur Sadar",
    union_name: null,
    lat: null,
    lng: null,
    is_eligible: 1,
    ...partial,
  };
}

describe("isRangpurCoreRequest", () => {
  it("treats Paglapir, Rangpur Sadar and union requests as core", () => {
    expect(isRangpurCoreRequest({ upazila: "Rangpur Sadar" })).toBe(true);
    expect(isRangpurCoreRequest({ upazila: "rangpur sadar" })).toBe(true);
    expect(isRangpurCoreRequest({ upazila: "Paglapir" })).toBe(true);
    expect(isRangpurCoreRequest({ upazila: null, union_name: "Mominpur" })).toBe(true);
  });

  it("treats other upazilas as non-core", () => {
    expect(isRangpurCoreRequest({ upazila: "Badarganj" })).toBe(false);
    expect(isRangpurCoreRequest({ upazila: "Pirganj", union_name: null })).toBe(false);
    expect(isRangpurCoreRequest({})).toBe(false);
  });
});

describe("selectDonorAlertRecipientsFromDonors — Rangpur core area", () => {
  const coreRequest = {
    blood_group: "O+",
    district: "Rangpur",
    upazila: "Rangpur Sadar",
    union_name: "Mominpur",
    ...RANGPUR_SADAR,
  };

  it("selects donors within 5 km (closest first)", () => {
    const near = donor({ id: 1, lat: 25.746, lng: 89.276 }); // ~2.3 km
    const nearer = donor({ id: 2, lat: 25.744, lng: 89.2755 }); // ~0.4 km
    const result = selectDonorAlertRecipientsFromDonors(coreRequest, [near, nearer]);
    expect(result.map((r) => r.id)).toEqual([2, 1]);
    expect(result[0].selection_reason).toBe("within_5km");
    expect(result[0].match_rank).toBe(1);
  });

  it("selects same-union donors even beyond 5 km", () => {
    const farSameUnion = donor({
      id: 3,
      union_name: "Mominpur",
      lat: 25.95, // ~23 km away
      lng: 89.28,
    });
    const result = selectDonorAlertRecipientsFromDonors(coreRequest, [farSameUnion]);
    expect(result).toHaveLength(1);
    expect(result[0].selection_reason).toBe("same_union");
  });

  it("selects Rangpur Sadar / Paglapir donors without coords", () => {
    const sadar = donor({ id: 4 }); // no coords → upazila centroid
    const paglapir = donor({ id: 5, upazila: "Paglapir" });
    const result = selectDonorAlertRecipientsFromDonors(coreRequest, [sadar, paglapir]);
    expect(result.map((r) => r.id).sort()).toEqual([4, 5]);
  });

  it("excludes donors outside the core area, union and 5 km ring", () => {
    const farOtherUpazila = donor({
      id: 6,
      upazila: "Badarganj",
      lat: 25.67, // ~8.6 km
      lng: 89.28,
    });
    const result = selectDonorAlertRecipientsFromDonors(coreRequest, [farOtherUpazila]);
    expect(result).toHaveLength(0);
  });

  it("excludes ineligible donors (recent donation, deactivated)", () => {
    const recent = donor({ id: 7, lat: 25.744, lng: 89.2755, is_eligible: 0 });
    const result = selectDonorAlertRecipientsFromDonors(coreRequest, [recent]);
    expect(result).toHaveLength(0);
  });
});

describe("selectDonorAlertRecipientsFromDonors — other upazilas", () => {
  const otherRequest = {
    blood_group: "B+",
    district: "Rangpur",
    upazila: "Badarganj",
    union_name: null,
    lat: null,
    lng: null,
  };

  it("selects only donors from the same upazila", () => {
    const local = donor({ id: 8, upazila: "Badarganj", blood_group: "B+" });
    const localBn = donor({ id: 9, upazila: "badarganj", blood_group: "B+" });
    const outsider = donor({ id: 10, upazila: "Rangpur Sadar", blood_group: "B+" });
    const result = selectDonorAlertRecipientsFromDonors(otherRequest, [
      local,
      localBn,
      outsider,
    ]);
    expect(result.map((r) => r.id).sort()).toEqual([8, 9]);
    expect(result.every((r) => r.selection_reason === "same_upazila")).toBe(true);
  });

  it("caps recipients at 15, closest first", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      donor({
        id: 100 + i,
        upazila: "Badarganj",
        blood_group: "B+",
        // Spread donors 1–20 km north of the request.
        lat: 25.67 + i * 0.045,
        lng: 89.28,
      }),
    );
    const result = selectDonorAlertRecipientsFromDonors(otherRequest, many);
    expect(result).toHaveLength(MAX_EMAIL_RECIPIENTS);
    // Closest donors win.
    expect(result[0].id).toBe(100);
    expect(result[14].id).toBe(114);
    expect(result.map((r) => r.match_rank)).toEqual(
      Array.from({ length: MAX_EMAIL_RECIPIENTS }, (_, i) => i + 1),
    );
  });
});

describe("selectSosAlertRecipientsFromDonors — Emergency SOS", () => {
  // Mirrors the EmergencySOS submission shape (upazila is the literal
  // "Emergency", district is the real zila).
  const sosRequest = {
    district: "Rangpur",
    upazila: "Emergency",
    union_name: null,
    lat: 25.7439,
    lng: 89.2752,
  };

  it("selects all eligible same-district donors (no 5 km limit)", () => {
    const near = donor({ id: 1, lat: 25.746, lng: 89.276 });
    const far = donor({ id: 2, lat: 25.95, lng: 89.28 }); // ~23 km away
    const result = selectSosAlertRecipientsFromDonors(sosRequest, [near, far]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.selection_reason === "sos_same_district")).toBe(true);
    expect(result[0].id).toBe(1); // closest first
  });

  it("ranks same-upazila donors before same-district ones", () => {
    const sameUpazila = donor({ id: 3, upazila: "Emergency", lat: 25.9, lng: 89.3 });
    const sameDistrictOnly = donor({ id: 4, lat: 25.744, lng: 89.2755 });
    const result = selectSosAlertRecipientsFromDonors(sosRequest, [
      sameDistrictOnly,
      sameUpazila,
    ]);
    expect(result[0].id).toBe(3);
    expect(result[0].selection_reason).toBe("sos_same_upazila");
    expect(result[1].selection_reason).toBe("sos_same_district");
  });

  it("excludes donors from other districts", () => {
    const otherZila = donor({ id: 5, district: "Dinajpur", lat: 25.75, lng: 89.28 });
    const result = selectSosAlertRecipientsFromDonors(sosRequest, [otherZila]);
    expect(result).toHaveLength(0);
  });

  it("excludes ineligible donors", () => {
    const ineligible = donor({ id: 6, is_eligible: 0 });
    const result = selectSosAlertRecipientsFromDonors(sosRequest, [ineligible]);
    expect(result).toHaveLength(0);
  });

  it("caps SOS recipients at 40, closest first", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      donor({
        id: 200 + i,
        // Spread donors north of the request along one axis so
        // distance grows monotonically with i. Keep every lat inside
        // valid Bangladesh bounds (~20.7–26.6) so coordinates resolve
        // literally instead of falling back to the upazila centroid.
        lat: 25.75 + i * 0.01,
        lng: 89.2752,
      }),
    );
    const result = selectSosAlertRecipientsFromDonors(sosRequest, many);
    expect(result).toHaveLength(MAX_SOS_EMAIL_RECIPIENTS);
    expect(result[0].id).toBe(200);
    expect(result[39].id).toBe(239);
  });
});
