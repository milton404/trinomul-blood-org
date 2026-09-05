import { describe, expect, it } from "vitest";
import bn from "@/messages/bn.json";

describe("Bengali common translations", () => {
  it("provides the common phone label used by the profile view", () => {
    expect(bn.common.phone).toBe("ফোন");
  });
});
