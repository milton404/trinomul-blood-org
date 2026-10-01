import { describe, it, expect } from "vitest";
import {
  createRequestSchema,
  createDonorSchema,
  patchProfileSchema,
  createPostSchema,
  updatePostSchema,
} from "@/lib/validation/schemas";

describe("createRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = createRequestSchema.safeParse({
      patientName: "John Doe",
      bloodGroup: "O+",
      district: "Dhaka",
      upazila: "Dhaka",
      hospitalName: "Square Hospital",
      contactNumber: "01700000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid blood group", () => {
    const result = createRequestSchema.safeParse({
      patientName: "John",
      bloodGroup: "X+",
      district: "Dhaka",
      upazila: "Dhaka",
      hospitalName: "Hospital",
      contactNumber: "01700000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = createRequestSchema.safeParse({
      bloodGroup: "O+",
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized strings", () => {
    const result = createRequestSchema.safeParse({
      patientName: "x".repeat(300),
      bloodGroup: "O+",
      district: "Dhaka",
      upazila: "Dhaka",
      hospitalName: "Hospital",
      contactNumber: "01700000000",
    });
    expect(result.success).toBe(false);
  });
});

describe("createDonorSchema", () => {
  it("accepts a valid donor", () => {
    const result = createDonorSchema.safeParse({
      email: "donor@example.com",
      fullNameEn: "John Doe",
      phone: "01700000000",
      bloodGroup: "A+",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createDonorSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("patchProfileSchema", () => {
  it("accepts valid fields", () => {
    const result = patchProfileSchema.safeParse({
      full_name_en: "Updated Name",
      phone: "01800000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strict)", () => {
    const result = patchProfileSchema.safeParse({
      full_name_en: "Name",
      password_hash: "should-not-be-here",
    });
    expect(result.success).toBe(false);
  });
});

describe("createPostSchema", () => {
  it("accepts a valid post", () => {
    const result = createPostSchema.safeParse({
      content: "Hello world",
      images: ["https://example.com/img.jpg"],
      postType: "general",
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 6 images", () => {
    const result = createPostSchema.safeParse({
      content: "Hello",
      images: Array(7).fill("https://example.com/img.jpg"),
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePostSchema", () => {
  it("accepts partial updates", () => {
    const result = updatePostSchema.safeParse({
      content: "Updated content",
    });
    expect(result.success).toBe(true);
  });

  it("rejects oversized content", () => {
    const result = updatePostSchema.safeParse({
      content: "x".repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});