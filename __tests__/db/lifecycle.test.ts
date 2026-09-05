import { describe, it, expect } from "vitest";
import {
  computeNeededExpiryMs,
  getRequestGraceMs,
  isLastChanceRequest,
  getFulfilledSealHideMs,
} from "@/lib/db";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// Fixed reference point: Monday 2026-01-05 10:00 local time.
const CREATED = "2026-01-05T10:00:00.000";
const createdMs = new Date(CREATED).getTime();

const endOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

describe("computeNeededExpiryMs", () => {
  it("'now'/'emergency' expires 6 hours after creation", () => {
    const row = { when_needed: "now", created_at: CREATED };
    expect(computeNeededExpiryMs(row)).toBe(createdMs + 6 * HOUR);
    expect(computeNeededExpiryMs({ ...row, when_needed: "emergency" })).toBe(createdMs + 6 * HOUR);
  });

  it("'today' expires at end of the creation day", () => {
    expect(computeNeededExpiryMs({ when_needed: "today", created_at: CREATED })).toBe(
      endOfDay(createdMs),
    );
  });

  it("'tomorrow' expires at end of the next day", () => {
    expect(computeNeededExpiryMs({ when_needed: "tomorrow", created_at: CREATED })).toBe(
      endOfDay(createdMs + DAY),
    );
  });

  it("'within_week' expires at end of day 7 days later", () => {
    expect(computeNeededExpiryMs({ when_needed: "within_week", created_at: CREATED })).toBe(
      endOfDay(createdMs + 7 * DAY),
    );
  });

  it("'specific_date' honours the requested date", () => {
    const expiry = computeNeededExpiryMs({
      when_needed: "specific_date",
      needed_date: "2026-01-10",
      needed_time: null,
      created_at: CREATED,
    });
    expect(expiry).toBe(endOfDay(new Date("2026-01-10").getTime()));
  });

  it("'specific_date' honours the requested clock time when provided", () => {
    const expiry = computeNeededExpiryMs({
      when_needed: "specific_date",
      needed_date: "2026-01-10",
      needed_time: "14:30",
      created_at: CREATED,
    });
    const expected = new Date("2026-01-10");
    expected.setHours(14, 30, 0, 0);
    expect(expiry).toBe(expected.getTime());
  });

  it("returns NaN for an unparseable created_at", () => {
    expect(
      Number.isNaN(computeNeededExpiryMs({ when_needed: "today", created_at: "not-a-date" })),
    ).toBe(true);
  });
});

describe("getRequestGraceMs", () => {
  it("regular requests get a 1-day grace", () => {
    expect(getRequestGraceMs({ when_needed: "today" })).toBe(DAY);
    expect(getRequestGraceMs({ when_needed: "now" })).toBe(DAY);
    expect(getRequestGraceMs({ when_needed: "within_week" })).toBe(DAY);
  });

  it("future-dated (specific_date) requests get a 2-day grace", () => {
    expect(getRequestGraceMs({ when_needed: "specific_date" })).toBe(2 * DAY);
  });
});

describe("isLastChanceRequest", () => {
  const active = {
    status: "active",
    when_needed: "today",
    created_at: CREATED,
  };
  const expiry = computeNeededExpiryMs(active); // end of creation day

  it("is false while the needed time has not passed", () => {
    expect(isLastChanceRequest(active, expiry - 1)).toBe(false);
    expect(isLastChanceRequest(active, expiry)).toBe(false);
  });

  it("is true inside the 1-day grace window (regular request)", () => {
    expect(isLastChanceRequest(active, expiry + 1)).toBe(true);
    expect(isLastChanceRequest(active, expiry + DAY - 1)).toBe(true);
  });

  it("is false once the grace window ends", () => {
    expect(isLastChanceRequest(active, expiry + DAY + 1)).toBe(false);
  });

  it("future-dated requests stay last-chance through the 2-day grace", () => {
    const future = {
      status: "active",
      when_needed: "specific_date",
      needed_date: "2026-01-10",
      needed_time: null,
      created_at: CREATED,
    };
    const fExpiry = computeNeededExpiryMs(future);
    expect(isLastChanceRequest(future, fExpiry + DAY)).toBe(true);
    expect(isLastChanceRequest(future, fExpiry + 2 * DAY - 1)).toBe(true);
    expect(isLastChanceRequest(future, fExpiry + 2 * DAY + 1)).toBe(false);
  });

  it("never applies to non-active requests", () => {
    expect(
      isLastChanceRequest({ ...active, status: "fulfilled" }, expiry + 1),
    ).toBe(false);
    expect(
      isLastChanceRequest({ ...active, status: "cancelled" }, expiry + 1),
    ).toBe(false);
  });
});

describe("getFulfilledSealHideMs", () => {
  it("seal hides at the end of the day AFTER fulfilment", () => {
    const fulfilledAt = "2026-01-05T15:00:00.000";
    const expected = new Date(fulfilledAt);
    expected.setDate(expected.getDate() + 1);
    expected.setHours(23, 59, 59, 999);
    expect(getFulfilledSealHideMs({ fulfilled_at: fulfilledAt })).toBe(expected.getTime());
  });

  it("falls back to donated_at, then updated_at", () => {
    const donated = "2026-01-05T15:00:00.000";
    const expected = new Date(donated);
    expected.setDate(expected.getDate() + 1);
    expected.setHours(23, 59, 59, 999);
    expect(getFulfilledSealHideMs({ fulfilled_at: null, donated_at: donated })).toBe(
      expected.getTime(),
    );
    expect(
      getFulfilledSealHideMs({ fulfilled_at: null, donated_at: null, updated_at: donated }),
    ).toBe(expected.getTime());
  });

  it("returns NaN when no timestamp is available", () => {
    expect(Number.isNaN(getFulfilledSealHideMs({}))).toBe(true);
  });
});
