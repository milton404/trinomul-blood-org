import { describe, it, expect } from "vitest";
import {
  getMatchingRequestsForDonor,
  getDonorMatchRequests,
  upsertDonorMatchResponse,
  getDonorMatchesForRequest,
} from "@/lib/db";

// Runtime exercise of the donor in-app response flow (feature #1) against the
// local SQLite DB. Read-only except for one self-cleaning upsert round-trip.

describe("getMatchingRequestsForDonor", () => {
  it("returns an array for a non-existent donor (no crash)", () => {
    const rows = getMatchingRequestsForDonor(9999999);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });

  it("returns rows with the expected shape for a real donor", () => {
    // Donor id=1 is the verified owner donor (backfilled 2026-09-18).
    const rows = getMatchingRequestsForDonor(1);
    expect(Array.isArray(rows)).toBe(true);
    for (const r of rows) {
      expect(r).toHaveProperty("request_id");
      expect(r).toHaveProperty("blood_group");
      expect(r).toHaveProperty("response_status");
      expect(r).toHaveProperty("request_status");
      // response_status is always resolved (pending when no donor_matches row).
      expect(["pending", "accepted", "declined", "no_response"]).toContain(
        r.response_status,
      );
      // Only active requests are returned.
      expect(r.request_status).toBe("active");
    }
  });
});

describe("getDonorMatchRequests (emailed-match inbox)", () => {
  it("returns an array for a non-existent donor", () => {
    const rows = getDonorMatchRequests(9999999);
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("upsertDonorMatchResponse (self-match path)", () => {
  it("inserts a self_matched row then updates it, and cleans up", () => {
    const Database = require("better-sqlite3");
    const path = require("path");
    const db = new Database(path.resolve("data/bloodbank.db"));
    const DONOR_ID = 1;

    // Find a real blood_request id where donor 1 has no existing match row.
    const candidate = db
      .prepare(
        `SELECT br.id FROM blood_requests br
         WHERE NOT EXISTS (SELECT 1 FROM donor_matches dm WHERE dm.request_id = br.id AND dm.donor_id = ?)
         LIMIT 1`,
      )
      .get(DONOR_ID) as { id: number } | undefined;
    db.close();

    if (!candidate) {
      // No suitable request — skip rather than mutate real data.
      expect(true).toBe(true);
      return;
    }
    const TEST_REQUEST_ID = candidate.id;

    try {
      // First call: no row exists → insert self_matched 'accepted'.
      const inserted = upsertDonorMatchResponse(TEST_REQUEST_ID, DONOR_ID, "accepted");
      expect(inserted).toBe(1);

      const matches = getDonorMatchesForRequest(TEST_REQUEST_ID) as any[];
      const mine = matches.find((m) => m.donor_id === DONOR_ID);
      expect(mine).toBeTruthy();
      expect(mine.response_status).toBe("accepted");
      expect(mine.notification_method).toBe("self_matched");

      // Second call: row exists → update to 'declined'.
      const updated = upsertDonorMatchResponse(TEST_REQUEST_ID, DONOR_ID, "declined");
      expect(updated).toBe(1);
      const matches2 = getDonorMatchesForRequest(TEST_REQUEST_ID) as any[];
      const mine2 = matches2.find((m) => m.donor_id === DONOR_ID);
      expect(mine2.response_status).toBe("declined");
    } finally {
      // Clean up the test row so the DB is left untouched.
      const Database2 = require("better-sqlite3");
      const db2 = new Database2(path.resolve("data/bloodbank.db"));
      db2.prepare("DELETE FROM donor_matches WHERE request_id = ? AND donor_id = ?").run(
        TEST_REQUEST_ID,
        DONOR_ID,
      );
      db2.close();
    }
  });
});