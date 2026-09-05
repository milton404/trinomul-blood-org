import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("profile avatar upload", () => {
  it("uses Cloudinary upload results instead of Base64 data URLs", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "components/auth/ProfileForm.tsx"),
      "utf8",
    );

    expect(source).toContain("uploadImageToCloudinary");
    expect(source).not.toContain("readAsDataURL");
  });
});
