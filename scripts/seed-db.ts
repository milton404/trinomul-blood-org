import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  RANGPUR_UNIONS,
} from "../lib/constants/rangpur.js";

const RANGPUR_CENTER = { lat: 25.7439, lng: 89.2752 };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "data", "bloodbank.db");

const db = new Database(DB_PATH);

function resolveCoords(
  districtName?: string,
  upazilaName?: string,
  unionName?: string,
): { lat: number; lng: number } {
  if (unionName) {
    const lower = unionName.toLowerCase();
    const union = RANGPUR_UNIONS.find(
      (u) =>
        u.id === lower ||
        u.name_en.toLowerCase() === lower ||
        u.name_bn === unionName,
    );
    if (union) return { lat: union.lat, lng: union.lng };
  }
  if (upazilaName) {
    const lower = upazilaName.toLowerCase();
    const upazila = RANGPUR_UPAZILAS.find(
      (u) =>
        u.id === lower ||
        u.name_en.toLowerCase() === lower ||
        u.name_bn === upazilaName,
    );
    if (upazila) return { lat: upazila.lat, lng: upazila.lng };
  }
  if (districtName) {
    const lower = districtName.toLowerCase();
    const district = RANGPUR_DISTRICTS.find(
      (d) =>
        d.id === lower ||
        d.name_en.toLowerCase() === lower ||
        d.name_bn === districtName,
    );
    if (district) return { lat: district.lat, lng: district.lng };
  }
  return RANGPUR_CENTER;
}

// Initialize tables first
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name_en TEXT,
    full_name_bn TEXT,
    phone TEXT,
    blood_group TEXT,
    role TEXT DEFAULT 'donor' CHECK(role IN ('donor', 'patient', 'hospital', 'admin', 'super_admin')),
    avatar_url TEXT,
    district TEXT,
    upazila TEXT,
    address TEXT,
    date_of_birth TEXT,
    sex TEXT,
    last_donation_date TEXT,
    is_active BOOLEAN DEFAULT 1,
    hb_level REAL,
    last_hb_test_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS blood_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER,
    requester_type TEXT DEFAULT 'user',
    patient_name TEXT NOT NULL,
    patient_age INTEGER,
    blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units_needed INTEGER DEFAULT 1,
    urgency_level TEXT DEFAULT 'normal' CHECK(urgency_level IN ('normal', 'urgent', 'critical')),
    when_needed TEXT DEFAULT 'today',
    needed_date TEXT,
    needed_time TEXT,
    district TEXT,
    upazila TEXT,
    lat REAL,
    lng REAL,
    hospital_name TEXT,
    hospital_address TEXT,
    contact_number TEXT,
    alternative_number TEXT,
    reason TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'fulfilled', 'expired', 'cancelled')),
    donor_id INTEGER,
    donated_at TEXT,
    patient_hb_level REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id INTEGER NOT NULL,
    request_id INTEGER,
    blood_group TEXT NOT NULL,
    units INTEGER DEFAULT 1,
    hospital_name TEXT,
    donation_date TEXT DEFAULT (datetime('now')),
    recipient_type TEXT DEFAULT 'Patient',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Clear existing data
db.exec("DELETE FROM donations");
db.exec("DELETE FROM blood_requests");
db.exec("DELETE FROM profiles");

// Seed profiles
const profiles = [
  {
    email: "admin@trinomul.com",
    password_hash: "demo_hash",
    full_name_en: "Admin User",
    full_name_bn: "অ্যাডমিন ব্যবহারকারী",
    phone: "01711111111",
    blood_group: "A+",
    role: "super_admin",
    district: "Rangpur",
    upazila: "Sadar",
  },
  {
    email: "rahim@example.com",
    password_hash: "demo_hash",
    full_name_en: "Rahim Uddin",
    full_name_bn: "রহিম উদ্দীন",
    phone: "01712222222",
    blood_group: "A+",
    role: "donor",
    district: "Rangpur",
    upazila: "Mithapukur",
  },
  {
    email: "karim@example.com",
    password_hash: "demo_hash",
    full_name_en: "Karim Ahmed",
    full_name_bn: "করিম আহমেদ",
    phone: "01713333333",
    blood_group: "B+",
    role: "donor",
    district: "Dinajpur",
    upazila: "Sadar",
  },
  {
    email: "sumi@example.com",
    password_hash: "demo_hash",
    full_name_en: "Sumi Akter",
    full_name_bn: "সুমি আক্তার",
    phone: "01714444444",
    blood_group: "O+",
    role: "donor",
    district: "Kurigram",
    upazila: "Nageshwari",
  },
  {
    email: "abul@example.com",
    password_hash: "demo_hash",
    full_name_en: "Abul Kashem",
    full_name_bn: "আবুল কাশেম",
    phone: "01715555555",
    blood_group: "AB+",
    role: "donor",
    district: "Gaibandha",
    upazila: "Gobindaganj",
  },
  {
    email: "fatema@example.com",
    password_hash: "demo_hash",
    full_name_en: "Fatema Begum",
    full_name_bn: "ফাতেমা বেগম",
    phone: "01716666666",
    blood_group: "B-",
    role: "patient",
    district: "Rangpur",
    upazila: "Sadar",
  },
  {
    email: "hospital@rmc.gov.bd",
    password_hash: "demo_hash",
    full_name_en: "Rangpur Medical College Hospital",
    full_name_bn: "রংপুর মেডিকেল কলেজ হাসপাতাল",
    phone: "052161001",
    blood_group: null,
    role: "hospital",
    district: "Rangpur",
    upazila: "Sadar",
  },
];

const insertProfile = db.prepare(`
  INSERT INTO profiles (email, password_hash, full_name_en, full_name_bn, phone, blood_group, role, district, upazila)
  VALUES (@email, @password_hash, @full_name_en, @full_name_bn, @phone, @blood_group, @role, @district, @upazila)
`);

for (const profile of profiles) {
  insertProfile.run(profile);
}
console.log(`✅ Seeded ${profiles.length} profiles`);

// Seed blood requests
const requests = [
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Mst. Fatema Begum",
    patient_age: 35,
    blood_group: "A+",
    units_needed: 2,
    urgency_level: "critical",
    when_needed: "now",
    district: "Rangpur",
    upazila: "Sadar",
    hospital_name: "Rangpur Medical College",
    hospital_address: "Medical Road, Rangpur",
    contact_number: "01716666666",
    reason:
      "Emergency surgery scheduled for tomorrow. Patient needs blood transfusion before operation.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Md. Solaiman",
    patient_age: 28,
    blood_group: "B-",
    units_needed: 1,
    urgency_level: "urgent",
    when_needed: "today",
    district: "Dinajpur",
    upazila: "Sadar",
    hospital_name: "Dinajpur Sadar Hospital",
    hospital_address: "Dinajpur Sadar",
    contact_number: "01717777777",
    reason: "Dengue fever patient with low platelet count.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Baby of Sumi",
    patient_age: 1,
    blood_group: "O+",
    units_needed: 1,
    urgency_level: "normal",
    when_needed: "tomorrow",
    district: "Kurigram",
    upazila: "Sadar",
    hospital_name: "Kurigram General Hospital",
    hospital_address: "Kurigram Sadar",
    contact_number: "01718888888",
    reason: "Newborn baby needs blood for medical treatment.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Rina Khatun",
    patient_age: 45,
    blood_group: "AB+",
    units_needed: 3,
    urgency_level: "urgent",
    when_needed: "today",
    district: "Gaibandha",
    upazila: "Sadar",
    hospital_name: "Gaibandha Sadar Hospital",
    hospital_address: "Gaibandha",
    contact_number: "01719999999",
    reason: "Patient needs blood for major surgery after accident.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Jamil Hossain",
    patient_age: 22,
    blood_group: "B+",
    units_needed: 1,
    urgency_level: "normal",
    when_needed: "day_after",
    district: "Nilphamari",
    upazila: "Sadar",
    hospital_name: "Nilphamari Sadar Hospital",
    hospital_address: "Nilphamari",
    contact_number: "01710000000",
    reason: "Thalassemia patient requires regular blood transfusion.",
    status: "active",
  },
  {
    requester_id: 2,
    requester_type: "donor",
    patient_name: "Anonymous Patient",
    patient_age: 30,
    blood_group: "A-",
    units_needed: 2,
    urgency_level: "critical",
    when_needed: "now",
    district: "Rangpur",
    upazila: "Pirgacha",
    hospital_name: "Upazila Health Complex",
    hospital_address: "Pirgacha",
    contact_number: "01711111111",
    reason: "Road accident victim in critical condition at local hospital.",
    status: "fulfilled",
  },
  {
    requester_id: 3,
    requester_type: "donor",
    patient_name: "Elderly Woman",
    patient_age: 65,
    blood_group: "O-",
    units_needed: 1,
    urgency_level: "urgent",
    when_needed: "today",
    district: "Lalmonirhat",
    upazila: "Sadar",
    hospital_name: "Lalmonirhat Upazila Health Complex",
    hospital_address: "Lalmonirhat",
    contact_number: "01713333333",
    reason: "Anemia patient requires urgent blood transfusion.",
    status: "cancelled",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Md. Hasan Ali",
    patient_age: 42,
    blood_group: "O+",
    units_needed: 2,
    urgency_level: "urgent",
    when_needed: "today",
    district: "Rangpur",
    upazila: "Badarganj",
    hospital_name: "Badarganj Upazila Health Complex",
    hospital_address: "Badarganj, Rangpur",
    contact_number: "01720000001",
    reason: "Kidney patient undergoing dialysis. Needs blood urgently due to severe anemia.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Shirin Akhter",
    patient_age: 8,
    blood_group: "AB-",
    units_needed: 1,
    urgency_level: "critical",
    when_needed: "now",
    district: "Rangpur",
    upazila: "Sadar",
    hospital_name: "Rangpur Shishu Hospital",
    hospital_address: "Shishu Hospital Road, Rangpur",
    contact_number: "01720000002",
    reason: "Child with thalassemia needs immediate blood transfusion.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Abdul Mannan",
    patient_age: 55,
    blood_group: "A+",
    units_needed: 3,
    urgency_level: "normal",
    when_needed: "day_after",
    district: "Thakurgaon",
    upazila: "Sadar",
    hospital_name: "Thakurgaon Sadar Hospital",
    hospital_address: "Thakurgaon Sadar",
    contact_number: "01720000003",
    reason: "Pre-surgery blood arrangement for bypass surgery scheduled in 2 days.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Rokeya Sultana",
    patient_age: 26,
    blood_group: "B+",
    units_needed: 2,
    urgency_level: "urgent",
    when_needed: "today",
    district: "Panchagarh",
    upazila: "Sadar",
    hospital_name: "Panchagarh Modern Hospital",
    hospital_address: "Panchagarh Sadar",
    contact_number: "01720000004",
    reason: "Post-delivery complication. Mother needs blood transfusion after severe bleeding.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Nur Islam",
    patient_age: 60,
    blood_group: "O-",
    units_needed: 1,
    urgency_level: "critical",
    when_needed: "now",
    district: "Rangpur",
    upazila: "Pirganj",
    hospital_name: "Pirganj Upazila Health Complex",
    hospital_address: "Pirganj, Rangpur",
    contact_number: "01720000005",
    reason: "Road accident victim with severe blood loss. O-negative universal donor urgently needed.",
    status: "active",
  },
  {
    requester_id: 6,
    requester_type: "user",
    patient_name: "Momena Bewa",
    patient_age: 70,
    blood_group: "AB+",
    units_needed: 2,
    urgency_level: "normal",
    when_needed: "today",
    district: "Rangpur",
    upazila: "Kaunia",
    hospital_name: "Kaunia Upazila Health Complex",
    hospital_address: "Kaunia, Rangpur",
    contact_number: "01720000006",
    reason: "Elderly patient with chronic anemia needs blood support.",
    status: "active",
  },
];

const insertRequest = db.prepare(`
  INSERT INTO blood_requests (requester_id, requester_type, patient_name, patient_age, blood_group, units_needed, urgency_level, when_needed, district, upazila, lat, lng, hospital_name, hospital_address, contact_number, reason, status)
  VALUES (@requester_id, @requester_type, @patient_name, @patient_age, @blood_group, @units_needed, @urgency_level, @when_needed, @district, @upazila, @lat, @lng, @hospital_name, @hospital_address, @contact_number, @reason, @status)
`);

for (const request of requests) {
  const coords = resolveCoords(request.district, request.upazila);
  insertRequest.run({ ...request, lat: coords.lat, lng: coords.lng });
}
console.log(`✅ Seeded ${requests.length} blood requests`);

// Seed donations
const donations = [
  {
    donor_id: 2,
    request_id: 6,
    blood_group: "A-",
    units: 2,
    hospital_name: "Upazila Health Complex",
    donation_date: "2024-02-15",
    recipient_type: "Patient",
  },
  {
    donor_id: 3,
    request_id: null,
    blood_group: "B+",
    units: 1,
    hospital_name: "Blood Donation Camp",
    donation_date: "2023-11-20",
    recipient_type: "Camp",
  },
  {
    donor_id: 4,
    request_id: null,
    blood_group: "O+",
    units: 1,
    hospital_name: "Kurigram General Hospital",
    donation_date: "2023-07-05",
    recipient_type: "Emergency",
  },
  {
    donor_id: 5,
    request_id: null,
    blood_group: "AB+",
    units: 1,
    hospital_name: "Rangpur Medical College",
    donation_date: "2023-03-18",
    recipient_type: "Surgery",
  },
];

const insertDonation = db.prepare(`
  INSERT INTO donations (donor_id, request_id, blood_group, units, hospital_name, donation_date, recipient_type)
  VALUES (@donor_id, @request_id, @blood_group, @units, @hospital_name, @donation_date, @recipient_type)
`);

for (const donation of donations) {
  insertDonation.run(donation);
}
console.log(`✅ Seeded ${donations.length} donations`);

console.log("\n🎉 Database seeded successfully!");
console.log(`   - Profiles: ${profiles.length}`);
console.log(`   - Blood Requests: ${requests.length}`);
console.log(`   - Donations: ${donations.length}`);
console.log(`   - Admin login: admin@trinomul.com / any password`);
