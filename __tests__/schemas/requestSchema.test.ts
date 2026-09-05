import { describe, it, expect } from "vitest";
import { z } from "zod";

const requestSchema = z.object({
  patientName: z.string().min(2, "Patient name is required"),
  patientAge: z.number().min(0).max(120),
  bloodGroup: z.string().min(1, "Blood group is required"),
  unitsNeeded: z.number().min(1, "At least 1 unit is required"),
  urgencyLevel: z.enum(["normal", "urgent", "critical"]),
  whenNeeded: z.enum([
    "now",
    "today",
    "tomorrow",
    "day_after",
    "specific_date",
  ]),
  district: z.string().min(1, "District is required"),
  upazila: z.string().min(1, "Upazila is required"),
  hospitalName: z.string().min(2, "Hospital name is required"),
  hospitalAddress: z.string().min(5, "Hospital address is required"),
  contactNumber: z.string().min(10, "Valid contact number is required"),
});

describe("Blood Request Schema Validation", () => {
  it("should validate correct request data", () => {
    const validData = {
      patientName: "Test Patient",
      patientAge: 30,
      bloodGroup: "A+",
      unitsNeeded: 2,
      urgencyLevel: "urgent" as const,
      whenNeeded: "today" as const,
      district: "rangpur",
      upazila: "sadar",
      hospitalName: "Test Hospital",
      hospitalAddress: "123 Main Street, Rangpur",
      contactNumber: "01712345678",
    };

    expect(requestSchema.parse(validData)).toEqual(validData);
  });

  it("should reject empty patient name", () => {
    const invalidData = {
      patientName: "",
      patientAge: 30,
      bloodGroup: "A+",
      unitsNeeded: 2,
      urgencyLevel: "urgent" as const,
      whenNeeded: "today" as const,
      district: "rangpur",
      upazila: "sadar",
      hospitalName: "Test Hospital",
      hospitalAddress: "123 Main Street, Rangpur",
      contactNumber: "01712345678",
    };

    expect(() => requestSchema.parse(invalidData)).toThrow(
      "Patient name is required",
    );
  });

  it("should reject age below 0 or above 120", () => {
    const dataWithInvalidAge = {
      patientName: "Test Patient",
      patientAge: -5,
      bloodGroup: "A+",
      unitsNeeded: 2,
      urgencyLevel: "normal" as const,
      whenNeeded: "now" as const,
      district: "rangpur",
      upazila: "sadar",
      hospitalName: "Test Hospital",
      hospitalAddress: "123 Main Street, Rangpur",
      contactNumber: "01712345678",
    };

    expect(() => requestSchema.parse(dataWithInvalidAge)).toThrow();
  });

  it("should accept valid blood groups", () => {
    const validBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    validBloodGroups.forEach((bg) => {
      const data = {
        patientName: "Test Patient",
        patientAge: 30,
        bloodGroup: bg,
        unitsNeeded: 2,
        urgencyLevel: "critical" as const,
        whenNeeded: "tomorrow" as const,
        district: "rangpur",
        upazila: "sadar",
        hospitalName: "Test Hospital",
        hospitalAddress: "123 Main Street, Rangpur",
        contactNumber: "01712345678",
      };

      expect(() => requestSchema.parse(data)).not.toThrow();
    });
  });

  it("should reject empty blood group", () => {
    const dataWithEmptyBloodGroup = {
      patientName: "Test Patient",
      patientAge: 30,
      bloodGroup: "",
      unitsNeeded: 2,
      urgencyLevel: "critical" as const,
      whenNeeded: "tomorrow" as const,
      district: "rangpur",
      upazila: "sadar",
      hospitalName: "Test Hospital",
      hospitalAddress: "123 Main Street, Rangpur",
      contactNumber: "01712345678",
    };

    expect(() => requestSchema.parse(dataWithEmptyBloodGroup)).toThrow(
      "Blood group is required",
    );
  });

  it("should reject short contact number", () => {
    const dataWithShortPhone = {
      patientName: "Test Patient",
      patientAge: 30,
      bloodGroup: "O+",
      unitsNeeded: 1,
      urgencyLevel: "normal" as const,
      whenNeeded: "today" as const,
      district: "rangpur",
      upazila: "sadar",
      hospitalName: "Test Hospital",
      hospitalAddress: "123 Main Street, Rangpur",
      contactNumber: "01712",
    };

    expect(() => requestSchema.parse(dataWithShortPhone)).toThrow(
      "Valid contact number is required",
    );
  });

  it("should accept valid Bangladesh phone numbers", () => {
    const bangladeshNumbers = [
      "01712345678",
      "01812345678",
      "01912345678",
      "01512345678",
      "01312345678",
      "01412345678",
    ];

    bangladeshNumbers.forEach((phone) => {
      const data = {
        patientName: "Test Patient",
        patientAge: 25,
        bloodGroup: "B+",
        unitsNeeded: 1,
        urgencyLevel: "normal" as const,
        whenNeeded: "today" as const,
        district: "rangpur",
        upazila: "sadar",
        hospitalName: "Test Hospital",
        hospitalAddress: "123 Main Street, Rangpur",
        contactNumber: phone,
      };

      expect(() => requestSchema.parse(data)).not.toThrow();
    });
  });
});
