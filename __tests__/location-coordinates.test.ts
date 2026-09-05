import { describe, expect, it } from "vitest";
import { isValidBangladeshCoordinatePair } from "@/lib/location-coordinates";

describe("isValidBangladeshCoordinatePair", () => {
  it("accepts a valid Rangpur coordinate pair", () => {
    expect(isValidBangladeshCoordinatePair(25.7439, 89.2752)).toBe(true);
  });

  it("rejects incomplete, non-finite, and out-of-country coordinate pairs", () => {
    expect(isValidBangladeshCoordinatePair(25.7439, null)).toBe(false);
    expect(isValidBangladeshCoordinatePair(Number.NaN, 89.2752)).toBe(false);
    expect(isValidBangladeshCoordinatePair(0, 0)).toBe(false);
    expect(isValidBangladeshCoordinatePair(40.7128, -74.006)).toBe(false);
  });
});
