import { describe, expect, it } from "vitest";

describe("donor card distance data", () => {
  it("keeps a calculated distance as a display-only field", () => {
    const donor = {
      lat: 25.74,
      lng: 89.27,
      distance_km: 4.2,
    };

    const cardProps = {
      distance_km: donor.distance_km,
    };

    expect(cardProps.distance_km).toBe(4.2);
    expect(cardProps).not.toHaveProperty("lat");
    expect(cardProps).not.toHaveProperty("lng");
  });
});
