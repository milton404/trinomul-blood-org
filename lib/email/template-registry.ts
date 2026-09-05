/**
 * Registry of system email templates (client-safe metadata — no server
 * imports). Shared by the admin template editor UI and the server-side
 * override loader so both stay in sync.
 *
 * `key` matches the `type` passed to sendEmail(), which is how the
 * override in the email_templates table is looked up.
 */

export interface TemplatePlaceholder {
  name: string;
  description: string;
}

export interface EmailTemplateMeta {
  key: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  /** Built-in subject (shown as the input placeholder). */
  defaultSubject: string;
  placeholders: TemplatePlaceholder[];
}

const COMMON: TemplatePlaceholder[] = [
  { name: "site_url", description: "Website URL" },
];

export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    key: "blood_request_alert",
    name: "Blood Request Alert",
    nameBn: "রক্তের অনুরোধ সতর্কতা",
    description: "Sent to nearby eligible donors when a blood request is posted.",
    descriptionBn: "রক্তের অনুরোধ পোস্ট হলে নিকটবর্তী যোগ্য দাতাদের পাঠানো হয়।",
    defaultSubject:
      "🩸 {{blood_group}} blood needed in {{upazila}} — {{patient_name}}",
    placeholders: [
      { name: "donor_name", description: "Recipient donor's name" },
      { name: "patient_name", description: "Patient name" },
      { name: "blood_group", description: "Blood group, e.g. B+" },
      { name: "units_needed", description: "Units needed" },
      { name: "location", description: "Hospital + address + area" },
      { name: "upazila", description: "Upazila name" },
      { name: "district", description: "District name" },
      { name: "when_needed", description: "Date/time needed" },
      { name: "contact_number", description: "Requester phone number" },
      { name: "reason", description: "Reason for the request" },
      { name: "track_url", description: "Tracking page link" },
      { name: "map_url", description: "Google Maps link" },
      ...COMMON,
    ],
  },
  {
    key: "blood_request_sos_alert",
    name: "Emergency SOS Alert",
    nameBn: "জরুরি SOS সতর্কতা",
    description:
      "Emergency version — sent district-wide (cap from settings) when an SOS request is posted.",
    descriptionBn:
      "জরুরি সংস্করণ — SOS অনুরোধ হলে পুরো জেলায় পাঠানো হয় (সীমা সেটিংস থেকে)।",
    defaultSubject:
      "🚨 EMERGENCY: {{blood_group}} blood needed NOW in {{district}} — {{patient_name}}",
    placeholders: [
      { name: "donor_name", description: "Recipient donor's name" },
      { name: "patient_name", description: "Patient name" },
      { name: "blood_group", description: "Blood group, e.g. B+" },
      { name: "units_needed", description: "Units needed" },
      { name: "location", description: "Hospital + address + area" },
      { name: "upazila", description: "Upazila name" },
      { name: "district", description: "District name" },
      { name: "when_needed", description: "Date/time needed" },
      { name: "contact_number", description: "Requester phone number" },
      { name: "reason", description: "Reason for the request" },
      { name: "track_url", description: "Tracking page link" },
      { name: "map_url", description: "Google Maps link" },
      ...COMMON,
    ],
  },
  {
    key: "request_confirmed",
    name: "Request Confirmation",
    nameBn: "অনুরোধ নিশ্চিতকরণ",
    description: "Sent to the requester with their tracking code.",
    descriptionBn: "ট্র্যাকিং কোডসহ অনুরোধকারীকে পাঠানো হয়।",
    defaultSubject: "Blood request received — tracking code {{tracking_code}}",
    placeholders: [
      { name: "requester_name", description: "Requester's name" },
      { name: "patient_name", description: "Patient name" },
      { name: "blood_group", description: "Blood group" },
      { name: "units_needed", description: "Units needed" },
      { name: "hospital_name", description: "Hospital name" },
      { name: "tracking_code", description: "Tracking code" },
      { name: "track_url", description: "Tracking page link" },
      ...COMMON,
    ],
  },
  {
    key: "password_reset",
    name: "Forgot Password",
    nameBn: "পাসওয়ার্ড রিসেট",
    description: "Password reset link (expires in 15 minutes).",
    descriptionBn: "পাসওয়ার্ড রিসেট লিংক (১৫ মিনিটে মেয়াদ শেষ)।",
    defaultSubject: "Reset your password — Trinomul Blood Bank",
    placeholders: [
      { name: "name", description: "User's name" },
      { name: "reset_url", description: "Password reset link" },
      ...COMMON,
    ],
  },
  {
    key: "password_reset_success",
    name: "Password Changed",
    nameBn: "পাসওয়ার্ড পরিবর্তিত",
    description: "Confirmation after a successful password change.",
    descriptionBn: "পাসওয়ার্ড পরিবর্তনের পর নিশ্চিতকরণ।",
    defaultSubject: "Your password has been changed — Trinomul Blood Bank",
    placeholders: [
      { name: "name", description: "User's name" },
      ...COMMON,
    ],
  },
  {
    key: "welcome",
    name: "Welcome",
    nameBn: "স্বাগতম",
    description: "Sent after a new user registers.",
    descriptionBn: "নতুন ব্যবহারকারী নিবন্ধনের পর পাঠানো হয়।",
    defaultSubject: "Welcome to Trinomul Blood Bank! 🩸",
    placeholders: [
      { name: "name", description: "User's name" },
      ...COMMON,
    ],
  },
  {
    key: "application_approved",
    name: "Application Approved",
    nameBn: "আবেদন অনুমোদিত",
    description: "Sent when a donor application is approved.",
    descriptionBn: "দাতা আবেদন অনুমোদিত হলে পাঠানো হয়।",
    defaultSubject: "You are now an approved donor — Trinomul Blood Bank",
    placeholders: [
      { name: "name", description: "Donor's name" },
      ...COMMON,
    ],
  },
  {
    key: "application_rejected",
    name: "Application Rejected",
    nameBn: "আবেদন প্রত্যাখ্যাত",
    description: "Sent when a donor application is rejected.",
    descriptionBn: "দাতা আবেদন প্রত্যাখ্যাত হলে পাঠানো হয়।",
    defaultSubject: "Update on your donor application — Trinomul Blood Bank",
    placeholders: [
      { name: "name", description: "Applicant's name" },
      ...COMMON,
    ],
  },
];

// ── SOS / alert settings metadata ──────────────────────────────────────

export interface EmailSettingMeta {
  key: string;
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  kind: "toggle" | "number";
  default: string;
  min?: number;
  max?: number;
}

export const EMAIL_SETTINGS: EmailSettingMeta[] = [
  {
    key: "sos_emails_enabled",
    label: "Emergency SOS emails",
    labelBn: "জরুরি SOS ইমেইল",
    description:
      "When ON, SOS requests email all eligible donors in the same zila + upazila. When OFF, SOS requests fall back to normal nearby targeting.",
    descriptionBn:
      "চালু থাকলে SOS অনুরোধ একই জেলা + উপজেলার সব যোগ্য দাতাকে ইমেইল পাঠায়। বন্ধ থাকলে স্বাভাবিক নিকটবর্তী টার্গেটিং ব্যবহার হয়।",
    kind: "toggle",
    default: "1",
  },
  {
    key: "sos_recipient_cap",
    label: "SOS recipient cap",
    labelBn: "SOS প্রাপক সীমা",
    description: "Maximum donors emailed per SOS request.",
    descriptionBn: "প্রতি SOS অনুরোধে সর্বাধিক যত দাতাকে ইমেইল যায়।",
    kind: "number",
    default: "40",
    min: 1,
    max: 200,
  },
  {
    key: "sos_send_delay_seconds",
    label: "SOS send delay (seconds)",
    labelBn: "SOS পাঠানোর বিলম্ব (সেকেন্ড)",
    description: "Wait after the request is posted before SOS emails go out.",
    descriptionBn: "অনুরোধ পোস্টের পর কত সেকেন্ড পরে SOS ইমেইল যায়।",
    kind: "number",
    default: "2",
    min: 0,
    max: 60,
  },
  {
    key: "alert_recipient_cap",
    label: "Normal alert recipient cap",
    labelBn: "স্বাভাবিক সতর্কতা প্রাপক সীমা",
    description: "Maximum donors emailed per normal blood request.",
    descriptionBn: "প্রতি স্বাভাবিক রক্তের অনুরোধে সর্বাধিক যত দাতাকে ইমেইল যায়।",
    kind: "number",
    default: "15",
    min: 1,
    max: 100,
  },
  {
    key: "alert_send_delay_seconds",
    label: "Normal alert send delay (seconds)",
    labelBn: "স্বাভাবিক সতর্কতা বিলম্ব (সেকেন্ড)",
    description: "Wait after the request is posted before alert emails go out.",
    descriptionBn: "অনুরোধ পোস্টের পর কত সেকেন্ড পরে সতর্কতা ইমেইল যায়।",
    kind: "number",
    default: "5",
    min: 0,
    max: 300,
  },
];

export function getTemplateMeta(key: string): EmailTemplateMeta | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}
