import { z } from "zod";

export const BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
] as const;

export const URGENCY_LEVELS = ["normal", "urgent", "emergency"] as const;

export const WHEN_NEEDED = [
  "now", "today", "tomorrow", "within_week", "specific_date", "emergency",
] as const;

const nullableString = z.union([z.string(), z.null()]).optional();
const nullableNumber = z.union([z.number(), z.null()]).optional();

export const createRequestSchema = z.object({
  requesterId: z.union([z.number(), z.string(), z.null()]).optional(),
  requesterType: z.string().max(50).optional().default("guest"),
  patientName: z.string().min(1).max(200),
  patientAge: z.union([z.number().int().min(0).max(150), z.null()]).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS),
  unitsNeeded: z.number().int().min(1).max(100).optional().default(1),
  urgencyLevel: z.enum(URGENCY_LEVELS).optional().default("normal"),
  whenNeeded: z.enum(WHEN_NEEDED).optional().default("today"),
  neededDate: nullableString,
  neededTime: nullableString,
  district: z.string().min(1).max(100),
  upazila: z.string().min(1).max(100),
  unionName: nullableString,
  lat: z.union([z.number(), z.null()]).optional(),
  lng: z.union([z.number(), z.null()]).optional(),
  hospitalName: z.string().min(1).max(200),
  hospitalAddress: nullableString,
  contactNumber: z.string().min(1).max(20),
  alternativeNumber: nullableString,
  whatsappNumber: nullableString,
  reason: nullableString,
  patientHbLevel: nullableNumber,
  status: z.string().optional(),
  ipAddress: nullableString,
  userAgent: z.string().max(500).optional(),
  idempotencyKey: z.string().max(200).nullable().optional(),
});

export const createDonorSchema = z.object({
  email: z.string().email().max(200),
  fullNameEn: z.string().max(200).optional(),
  fullNameBn: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  district: z.string().max(100).optional(),
  upazila: z.string().max(100).optional(),
  lat: z.union([z.number(), z.null()]).optional(),
  lng: z.union([z.number(), z.null()]).optional(),
  address: z.string().max(500).optional(),
  whatsappNumber: z.string().max(20).optional(),
  sex: z.string().max(10).optional(),
  dateOfBirth: z.string().max(20).optional(),
  weightKg: z.union([z.number().min(1).max(500), z.null()]).optional(),
  occupation: z.string().max(200).optional(),
  preferredContact: z.string().max(20).optional(),
  hbLevel: z.union([z.number(), z.null()]).optional(),
  lastHbTestDate: z.string().max(20).optional(),
  lastDonationDate: z.string().max(20).optional(),
  hasChronicDisease: z.boolean().optional(),
  diseaseDetails: z.string().max(1000).optional(),
  avatarUrl: z.string().max(500).optional(),
  avatar_url: z.string().max(500).optional(),
});

export const patchProfileSchema = z.object({
  full_name_en: z.string().max(200).optional(),
  full_name_bn: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  whatsapp_number: z.string().max(20).optional(),
  preferred_contact: z.string().max(20).optional(),
  blood_group: z.enum(BLOOD_GROUPS).optional(),
  district: z.string().max(100).optional(),
  upazila: z.string().max(100).optional(),
  union_name: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  is_active: z.union([z.boolean(), z.number()]).optional(),
  avatar_url: z.string().max(500).optional(),
}).strict();

export const createPostSchema = z.object({
  content: z.string().max(10000).optional().default(""),
  images: z.array(z.string().max(2000)).max(6).optional().default([]),
  postType: z.string().max(50).optional().default("general"),
  relatedRequestId: z.union([z.number().int(), z.null()]).optional(),
  isPublic: z.boolean().optional().default(true),
});

export const updatePostSchema = z.object({
  content: z.string().max(10000).optional(),
  images: z.array(z.string().max(2000)).max(6).optional(),
  isPublic: z.boolean().optional(),
});