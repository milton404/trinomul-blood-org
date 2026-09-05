/**
 * Seed 3 demo accounts (donor, patient, hospital) with fully-filled profiles
 * and a known password ("demo1234"). Safe to re-run — uses INSERT OR REPLACE
 * so existing demo accounts are updated rather than duplicated.
 *
 * Usage:  npx tsx scripts/seed-demo-accounts.ts
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "data", "bloodbank.db");

const db = new Database(DB_PATH);

// Ensure all columns we need exist (the table may have been created by an
// older schema version that predates lat/lng/weight_kg/etc.).
const ensureColumns: Record<string, string> = {
  lat: "REAL",
  lng: "REAL",
  weight_kg: "REAL",
  hospital_name_en: "TEXT",
  hospital_name_bn: "TEXT",
  license_number: "TEXT",
  website: "TEXT",
  hb_level: "REAL",
  last_hb_test_date: "TEXT",
};
for (const [col, type] of Object.entries(ensureColumns)) {
  try {
    db.prepare(`SELECT ${col} FROM profiles LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE profiles ADD COLUMN ${col} ${type}`);
    console.log(`  ℹ️  Added missing column: profiles.${col}`);
  }
}

const DEMO_PASSWORD = "demo1234";
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

type DemoProfile = {
  email: string;
  password_hash: string;
  full_name_en: string;
  full_name_bn: string;
  phone: string;
  blood_group: string | null;
  role: "donor" | "patient" | "hospital";
  avatar_url: string | null;
  district: string;
  upazila: string;
  address: string;
  date_of_birth: string | null;
  sex: string | null;
  last_donation_date: string | null;
  is_active: number;
  hb_level: number | null;
  last_hb_test_date: string | null;
  hospital_name_en: string | null;
  hospital_name_bn: string | null;
  license_number: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  weight_kg: number | null;
};

const profiles: DemoProfile[] = [
  // ─── DONOR ───────────────────────────────────────────────
  {
    email: "demo.donor@trinomul.com",
    password_hash: passwordHash,
    full_name_en: "Demo Donor (Rahim)",
    full_name_bn: "ডেমো রক্তদাতা (রহিম)",
    phone: "01701000001",
    blood_group: "O+",
    role: "donor",
    avatar_url: null,
    district: "Rangpur",
    upazila: "Sadar",
    address: "House 12, Central Road, Rangpur Sadar",
    date_of_birth: "1995-04-15",
    sex: "male",
    last_donation_date: "2026-05-10",
    is_active: 1,
    hb_level: 14.2,
    last_hb_test_date: "2026-07-01",
    hospital_name_en: null,
    hospital_name_bn: null,
    license_number: null,
    website: null,
    lat: 25.7439,
    lng: 89.2752,
    weight_kg: 68,
  },

  // ─── PATIENT / REQUESTER ─────────────────────────────────
  {
    email: "demo.patient@trinomul.com",
    password_hash: passwordHash,
    full_name_en: "Demo Patient (Sumi)",
    full_name_bn: "ডেমো রোগী (সুমি)",
    phone: "01701000002",
    blood_group: "B+",
    role: "patient",
    avatar_url: null,
    district: "Rangpur",
    upazila: "Sadar",
    address: "Village: Balapatam, Rangpur Sadar",
    date_of_birth: "1990-09-22",
    sex: "female",
    last_donation_date: null,
    is_active: 1,
    hb_level: 9.5,
    last_hb_test_date: "2026-08-01",
    hospital_name_en: null,
    hospital_name_bn: null,
    license_number: null,
    website: null,
    lat: 25.7439,
    lng: 89.2752,
    weight_kg: 55,
  },

  // ─── HOSPITAL ────────────────────────────────────────────
  {
    email: "demo.hospital@trinomul.com",
    password_hash: passwordHash,
    full_name_en: "Rangpur Medical College Hospital (Demo)",
    full_name_bn: "রংপুর মেডিকেল কলেজ হাসপাতাল (ডেমো)",
    phone: "052161001",
    blood_group: null,
    role: "hospital",
    avatar_url: null,
    district: "Rangpur",
    upazila: "Sadar",
    address: "Medical Road, Rangpur-5400",
    date_of_birth: null,
    sex: null,
    last_donation_date: null,
    is_active: 1,
    hb_level: null,
    last_hb_test_date: null,
    hospital_name_en: "Rangpur Medical College Hospital",
    hospital_name_bn: "রংপুর মেডিকেল কলেজ হাসপাতাল",
    license_number: "RMCH-1972-001",
    website: "https://rmc.gov.bd",
    lat: 25.7439,
    lng: 89.2752,
    weight_kg: null,
  },
];

const upsert = db.prepare(`
  INSERT INTO profiles (
    email, password_hash, full_name_en, full_name_bn, phone, blood_group,
    role, avatar_url, district, upazila, address, date_of_birth, sex,
    last_donation_date, is_active, hb_level, last_hb_test_date,
    hospital_name_en, hospital_name_bn, license_number, website, lat, lng
  ) VALUES (
    @email, @password_hash, @full_name_en, @full_name_bn, @phone, @blood_group,
    @role, @avatar_url, @district, @upazila, @address, @date_of_birth, @sex,
    @last_donation_date, @is_active, @hb_level, @last_hb_test_date,
    @hospital_name_en, @hospital_name_bn, @license_number, @website, @lat, @lng
  )
  ON CONFLICT(email) DO UPDATE SET
    password_hash = excluded.password_hash,
    full_name_en = excluded.full_name_en,
    full_name_bn = excluded.full_name_bn,
    phone = excluded.phone,
    blood_group = excluded.blood_group,
    role = excluded.role,
    district = excluded.district,
    upazila = excluded.upazila,
    address = excluded.address,
    date_of_birth = excluded.date_of_birth,
    sex = excluded.sex,
    last_donation_date = excluded.last_donation_date,
    hb_level = excluded.hb_level,
    last_hb_test_date = excluded.last_hb_test_date,
    hospital_name_en = excluded.hospital_name_en,
    hospital_name_bn = excluded.hospital_name_bn,
    license_number = excluded.license_number,
    website = excluded.website,
    lat = excluded.lat,
    lng = excluded.lng,
    updated_at = datetime('now')
`);

const updateWeight = db.prepare(`
  UPDATE profiles SET weight_kg = @weight_kg WHERE email = @email
`);

// weight_kg column is handled by ensureColumns above.

const tx = db.transaction(() => {
  for (const p of profiles) {
    upsert.run(p);
    updateWeight.run({ email: p.email, weight_kg: p.weight_kg });
  }
});
tx();

console.log("\n🎉 Demo accounts seeded successfully!\n");
console.log("  All passwords: demo1234\n");
for (const p of profiles) {
  console.log(
    `  ${p.role.padEnd(8)}  ${p.email.padEnd(32)}  ${p.full_name_en}`,
  );
}
console.log("");
