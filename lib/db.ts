// Server-only module - do not import from client components
import Database from "better-sqlite3";
import path from "path";
import {
  toValidBangladeshCoordinates,
  resolveLocationCoordinates,
} from "@/lib/location-coordinates";
import { rankDonorCandidates } from "@/lib/donor-ranking";

// Use relative path for server-only module
const DB_PATH = path.resolve("data/bloodbank.db");

/**
 * Resolve coordinates for a blood request using the selected district/upazila
 * names. Used as a fallback when the caller does not provide real GPS coords.
 * Resolution priority: passed lat/lng → upazila centroid → district centroid → Rangpur center.
 */
function resolveCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
  districtName?: string,
  upazilaName?: string,
  unionName?: string,
): { lat: number; lng: number } {
  // District-scoped hierarchy matching lives in lib/location-coordinates —
  // it prevents same-named upazilas in different districts (Pirganj,
  // Phulbari) from resolving to the wrong district's centroid.
  return resolveLocationCoordinates(
    lat,
    lng,
    districtName,
    upazilaName,
    unionName,
  );
}

/**
 * Resolve a donor's coordinates. Prefers stored lat/lng from the profile
 * (set via the map picker during registration), falling back to the upazila
 * centroid, then district centroid, then Rangpur center.
 */
function resolveDonorCoords(
  storedLat?: number | null,
  storedLng?: number | null,
  upazilaName?: string,
  districtName?: string,
  unionName?: string,
): { lat: number; lng: number } {
  const exactCoords = toValidBangladeshCoordinates(storedLat, storedLng);
  if (exactCoords) {
    return exactCoords;
  }
  return resolveCoords(null, null, districtName, upazilaName, unionName);
}

export const DONATION_COOLDOWN_DAYS = 120;
export const DONATION_TYPES = {
  whole_blood: {
    label_en: "Whole Blood",
    label_bn: "সম্পূর্ণ রক্ত",
    cooldown_days: 90,
  },
  platelets: {
    label_en: "Platelets",
    label_bn: "প্লাটিলেট",
    cooldown_days: 14,
  },
  plasma: { label_en: "Plasma", label_bn: "প্লাজমা", cooldown_days: 30 },
} as const;
export type DonationType = keyof typeof DONATION_TYPES;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initTables(db);
    seedSampleData();
  }
  return db;
}

function initTables(db: Database.Database) {
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
      hospital_name_en TEXT,
      hospital_name_bn TEXT,
      license_number TEXT,
      website TEXT,
      last_donation_date TEXT,
      is_active BOOLEAN DEFAULT 1,
      weight_kg REAL,
      alternative_phone TEXT,
      whatsapp_number TEXT,
      preferred_contact TEXT DEFAULT 'call',
      occupation TEXT,
      has_chronic_disease BOOLEAN DEFAULT 0,
      disease_details TEXT,
      lat REAL,
      lng REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN weight_kg REAL`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN alternative_phone TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN whatsapp_number TEXT`);
  } catch {}
  try {
    db.exec(
      `ALTER TABLE profiles ADD COLUMN preferred_contact TEXT DEFAULT 'call'`,
    );
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN occupation TEXT`);
  } catch {}
  try {
    db.exec(
      `ALTER TABLE profiles ADD COLUMN has_chronic_disease BOOLEAN DEFAULT 0`,
    );
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN disease_details TEXT`);
  } catch {}
  try {
    db.exec(
      `ALTER TABLE profiles ADD COLUMN last_donation_type TEXT DEFAULT 'whole_blood'`,
    );
  } catch {}
  try {
    db.exec(
      `ALTER TABLE donations ADD COLUMN donation_type TEXT DEFAULT 'whole_blood'`,
    );
  } catch {}

  // Phase 5.3: Multi-Organization Network — architect DB to support org_id
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN organization_id INTEGER DEFAULT 1`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN organization_id INTEGER DEFAULT 1`);
  } catch {}

  // Phase 5.2: Donor Leaderboard opt-in
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN show_on_leaderboard BOOLEAN DEFAULT 0`);
  } catch {}

  // Phase 6: Request lifecycle — soft-delete/archive + fulfilled seal + referrer
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN archived_at TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN archive_reason TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN fulfilled_at TEXT`);
  } catch {}
  try {
    db.exec(
      `ALTER TABLE blood_requests ADD COLUMN show_fulfilled_badge INTEGER DEFAULT 1`,
    );
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN admin_notice TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN whatsapp_number TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN ip_address TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN user_agent TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN edited_at TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN edit_count INTEGER DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN referrer_profile_id INTEGER`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN referrer_name TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN referrer_phone TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE donations ADD COLUMN referrer_profile_id INTEGER`);
  } catch {}
  try {
    db.exec(`ALTER TABLE donations ADD COLUMN referrer_name TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE donations ADD COLUMN referrer_phone TEXT`);
  } catch {}

  // Hemoglobin (Hb) tracking for donors — optional field; low Hb defers
  // the donor from public search and matching (see getDonorsWithStats /
  // findMatchingDonors).
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN hb_level REAL`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN last_hb_test_date TEXT`);
  } catch {}

  // Admin-only patient Hb on blood requests — internal tracking, never
  // exposed to donors or the public frontend.
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN patient_hb_level REAL`);
  } catch {}

  // Union-level location breakdown. Currently only Rangpur Sadar upazila
  // has unions; the column is nullable so all other upazilas stay blank.
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN union_name TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN union_name TEXT`);
  } catch {}

  // Email system: donor opt-in for alert emails (default ON).
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN email_opt_in BOOLEAN DEFAULT 1`);
  } catch {}

  // Email system: audit log for every outbound email (best-effort trail).
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      to_email TEXT,
      request_id INTEGER,
      status TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Email system: admin-editable template overrides (subject/body HTML).
  // key = logical email type (e.g. 'blood_request_alert'). NULL subject or
  // body means "use the built-in default".
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_templates (
      key TEXT PRIMARY KEY,
      subject TEXT,
      body TEXT,
      enabled INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Email system: key-value settings (SOS cap, delays, toggles).
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // One-time migration: hide legacy expired/cancelled requests from the
  // frontend. They stay in the DB forever for admin history.
  try {
    db.exec(`
      UPDATE blood_requests
      SET archived_at = COALESCE(updated_at, created_at),
          archive_reason = status
      WHERE archived_at IS NULL AND status IN ('expired', 'cancelled')
    `);
  } catch {}

  // Phase 5: Organizations table for multi-org network
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_bn TEXT,
      description TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      district TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed default organization (Trinomul) if not exists
  const orgCount = (db.prepare("SELECT COUNT(*) as count FROM organizations").get() as { count: number }).count;
  if (orgCount === 0) {
    db.prepare(`
      INSERT INTO organizations (id, name_en, name_bn, description, contact_phone, contact_email, district)
      VALUES (1, 'Trinomul Blood Bank', 'ত্রিণমূল ব্লাড ব্যাংক', 'Community-based voluntary blood donation organization in Rangpur, Bangladesh.', '01734449666', 'contact@trinomul.org', 'Rangpur')
    `).run();
  }

  db.exec(`
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
      whatsapp_number TEXT,
      reason TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'fulfilled', 'expired', 'cancelled')),
      donor_id INTEGER,
      donated_at TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
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

  // ── Social community feed ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      author_role TEXT,
      content TEXT,
      images TEXT,                 -- JSON array of Cloudinary secure URLs
      post_type TEXT DEFAULT 'general'
        CHECK(post_type IN ('general', 'donation_update', 'admin_announcement', 'blood_request')),
      related_request_id INTEGER,  -- when post_type = 'blood_request'
      pinned INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'deleted')),
      share_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at)",
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS social_post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_social_likes_post ON social_post_likes(post_id)",
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS social_post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      author_role TEXT,
      author_name TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_post_comments(post_id)",
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS social_post_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
    )
  `);

  // ── Stories (Instagram-style, auto-expire after 24h) ───────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      image_url TEXT,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at)");

  // ── Post saves / bookmarks (separate from donor bookmarks) ─────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_post_saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_social_saves_post ON social_post_saves(post_id)");

  // ── Web Push subscriptions (PWA notifications) ─────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ── Story views (who viewed each story) ───────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS story_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      viewer_id INTEGER NOT NULL,
      viewed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(story_id, viewer_id),
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (viewer_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id)");

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      actor_id INTEGER,
      type TEXT NOT NULL,
      post_id INTEGER,
      content TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)");

  // social_posts.view_count (added for post impression counts)
  try {
    db.exec("ALTER TABLE social_posts ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column already exists */
  }

  // Server-side auth rate limiting (replaces the in-memory client limiter).
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      identifier TEXT PRIMARY KEY,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      first_attempt_at INTEGER NOT NULL,
      last_attempt_at INTEGER NOT NULL,
      locked_until INTEGER
    )
  `);

  // Password reset tokens (15-minute expiry enforced in app logic).
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)",
  );

  // Request status log — tracks every status change for a blood request.
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_status_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      changed_by TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_status_log_request ON request_status_log(request_id)",
  );

  // Request edit history — tracks every field-level edit to a blood request
  // (by guest, registered user, or admin). Stores previous + new values as
  // JSON so the admin panel can show a full audit trail.
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_edit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      editor_type TEXT NOT NULL CHECK(editor_type IN ('guest', 'user', 'admin')),
      editor_id INTEGER,
      editor_email TEXT,
      editor_ip TEXT,
      editor_name TEXT,
      previous_values TEXT,
      new_values TEXT,
      changed_fields TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_edit_history_request ON request_edit_history(request_id)",
  );

  // Pre-translated Bengali share text for blood requests.
  // Generated ~2 min after a request is posted so the "Copy Text" button
  // can return the Bengali message instantly without waiting for AI.
  // ON DELETE CASCADE ensures translations are purged when the request is deleted.
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_translations (
      request_id INTEGER PRIMARY KEY REFERENCES blood_requests(id) ON DELETE CASCADE,
      bn_text TEXT NOT NULL,
      bn_fields TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try {
    db.exec("ALTER TABLE request_translations ADD COLUMN bn_fields TEXT");
  } catch {}

  // Donor matches — tracks which donors were notified for which requests
  // and their response status.
  db.exec(`
    CREATE TABLE IF NOT EXISTS donor_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      donor_id INTEGER NOT NULL,
      match_rank INTEGER DEFAULT 0,
      match_score REAL DEFAULT 0,
      notification_method TEXT DEFAULT 'sms',
      response_status TEXT DEFAULT 'pending' CHECK(response_status IN ('pending', 'accepted', 'declined', 'no_response')),
      responded_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (donor_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_donor_matches_request ON donor_matches(request_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON donor_matches(donor_id)",
  );

  // Add tracking_code column to blood_requests if not exists
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN tracking_code TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN current_status TEXT DEFAULT 'submitted'`);
  } catch {}
  try {
    db.exec(`ALTER TABLE blood_requests ADD COLUMN boosted_at TEXT`);
  } catch {}

  // District-scoped sub-admin support: an `admin` with assigned_district set
  // can only manage that district's donors/requests. Full admins and
  // super_admins leave these NULL.
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN assigned_district TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN assigned_upazila TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN admin_policy_accepted_at TEXT`);
  } catch {}

  // Saved patient profiles — a requester can save the people they regularly
  // request blood for (child, parent, spouse) and pre-fill new requests.
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      age INTEGER,
      blood_group TEXT,
      relation TEXT,
      condition_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_saved_patients_owner ON saved_patients(owner_id)",
  );

  // Site-wide settings (key/value store) for the admin Settings page.
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Real audit trail for admin actions. Replaces the fabricated data in the
  // activity-log page. actor_id/actor_email capture the session user.
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action)",
  );

  // ── Contact-form submissions (public → admin review) ─────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT,
      message TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON contact_messages(is_read)",
  );

  // ── Donor Identity Verification (NID + admin approval) ─────────────────
  // A donor uploads both sides of their NID (Cloudinary URLs) and enters
  // their NID number. An admin/super_admin then calls the donor to confirm
  // phone, reviews the NID, and sets verification_status → 'verified' or
  // 'rejected'. `is_verified` is the master flag (1 only when both phone
  // and NID are confirmed). Non-verified donors still appear publicly —
  // they just don't get the verified badge. See phases 3–5 of the
  // verification feature plan.
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN nid_number TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN nid_front_url TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN nid_back_url TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN nid_uploaded_at TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT 0`);
  } catch {}
  try {
    db.exec(
      `ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified'`,
    );
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN verified_by_admin_id INTEGER`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN verified_at TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN verification_note TEXT`);
  } catch {}

  // ── Donor presence & response metrics ─────────────────────────────────
  // `last_active_at` is pinged on login + via a heartbeat hook so the
  // public card can show an online dot / "last active" label.
  // `response_count` / `response_total_ms` accumulate per-donor response
  // times to compute avg response time and response rate on the card.
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN last_active_at TEXT`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN response_count INTEGER DEFAULT 0`);
  } catch {}
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN response_total_ms INTEGER DEFAULT 0`);
  } catch {}

  // ── Anonymous mode ────────────────────────────────────────────────────
  // When enabled, the public card hides the donor's name and shows only
  // blood group + area + verified badge.
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN is_anonymous BOOLEAN DEFAULT 0`);
  } catch {}

  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN is_approved BOOLEAN DEFAULT 0`);
  } catch {}

  // Index the verification queue lookup (admin "pending verifications" view).
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified)",
  );

  // ── Donor bookmarks ───────────────────────────────────────────────────
  // A logged-in user can bookmark/save a donor for quick access. UNIQUE
  // constraint prevents duplicate bookmarks by the same user. ON DELETE
  // CASCADE keeps the table clean when either side is removed.
  db.exec(`
    CREATE TABLE IF NOT EXISTS donor_bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      donor_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, donor_id),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (donor_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_donor_bookmarks_user ON donor_bookmarks(user_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_donor_bookmarks_donor ON donor_bookmarks(donor_id)",
  );

  // ── Donor contact clicks ─────────────────────────────────────────────
  // Tracks every time someone clicks "Call" or "WhatsApp" on a donor card.
  // Stores the clicker's IP (always) and user ID/name (if logged in) so
  // admins can see how many people are contacting each donor.
  db.exec(`
    CREATE TABLE IF NOT EXISTS donor_contact_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER NOT NULL,
      button_type TEXT NOT NULL CHECK(button_type IN ('call', 'whatsapp')),
      clicker_ip TEXT,
      clicker_user_id INTEGER,
      clicker_user_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (donor_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (clicker_user_id) REFERENCES profiles(id) ON DELETE SET NULL
    )
  `);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_donor_contact_clicks_donor ON donor_contact_clicks(donor_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_donor_contact_clicks_created ON donor_contact_clicks(created_at)",
  );
}

// Profile queries
export function getProfileByUserId(userId: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM profiles WHERE id = ?").get(userId);
}

export function getProfileByEmail(email: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM profiles WHERE email = ?").get(email);
}

export function getProfileByPhone(phone: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM profiles WHERE phone = ?").get(phone);
}

export function createProfile(profile: Record<string, any>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO profiles (email, password_hash, full_name_en, full_name_bn, phone, blood_group, role, district, upazila, union_name, hospital_name_en, hospital_name_bn, license_number, website, lat, lng)
    VALUES (@email, @passwordHash, @fullNameEn, @fullNameBn, @phone, @bloodGroup, @role, @district, @upazila, @unionName, @hospitalNameEn, @hospitalNameBn, @licenseNumber, @website, @lat, @lng)
  `);
  return stmt.run(profile).lastInsertRowid as number;
}

export function updateProfile(id: number, data: Record<string, any>) {
  const db = getDb();
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(", ");
  const stmt = db.prepare(
    `UPDATE profiles SET ${fields}, updated_at = datetime('now') WHERE id = @id`,
  );
  const changes = stmt.run({ ...data, id }).changes;

  // Admin alert: a donor registered/updated with a low Hb reading. Log it
  // so the admin NotificationPanel can surface it (in-app only).
  if (
    changes > 0 &&
    data.hb_level != null &&
    data.role !== "patient" &&
    data.role !== "hospital"
  ) {
    const profile = db
      .prepare("SELECT sex, role, full_name_en FROM profiles WHERE id = ?")
      .get(id) as any;
    if (profile && profile.role === "donor") {
      const isLow =
        (profile.sex === "female" && data.hb_level < 12.5) ||
        (profile.sex !== "female" && data.hb_level < 13.0);
      if (isLow) {
        recordActivityLog({
          actorId: id,
          actorEmail: "",
          action: "low_hb_detected",
          entityType: "profile",
          entityId: String(id),
          details: `Donor ${profile.full_name_en || `#${id}`} registered with low Hb: ${data.hb_level} g/dL`,
        });
      }
    }
  }

  return changes;
}

export function getAllProfiles() {
  const db = getDb();
  return db.prepare("SELECT * FROM profiles ORDER BY created_at DESC").all();
}

export function getProfilesByRole(role: string) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM profiles WHERE role = ? ORDER BY created_at DESC")
    .all(role);
}

export function getProfilesByRoles(roles: string[]) {
  const db = getDb();
  const placeholders = roles.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT * FROM profiles WHERE role IN (${placeholders}) ORDER BY created_at DESC`,
    )
    .all(...roles);
}

export function deleteProfile(id: number) {
  const db = getDb();
  return db.prepare("DELETE FROM profiles WHERE id = ?").run(id).changes;
}

export function searchProfiles(filters?: {
  role?: string;
  isActive?: boolean;
  search?: string;
  districts?: string[];
  hbStatus?: "eligible" | "low_hb" | "not_tested";
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  let sql = "SELECT * FROM profiles WHERE 1=1";
  const params: any[] = [];

  if (filters?.role && filters.role !== "all") {
    sql += " AND role = ?";
    params.push(filters.role);
  }
  if (filters?.districts && filters.districts.length > 0) {
    const ph = filters.districts.map(() => "?").join(",");
    sql += ` AND LOWER(COALESCE(district, '')) IN (${ph})`;
    params.push(...filters.districts.map((d) => d.toLowerCase()));
  }
  if (filters?.isActive === true) {
    sql += " AND is_active = 1";
  } else if (filters?.isActive === false) {
    sql += " AND is_active = 0";
  }
  if (filters?.search) {
    sql +=
      " AND (full_name_en LIKE ? OR full_name_bn LIKE ? OR phone LIKE ? OR email LIKE ?)";
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }
  // Hemoglobin status filter (donor Hb): eligible / low Hb (deferred) /
  // not tested (no reading on file). Threshold: < 12.5 for females,
  // < 13.0 for everyone else.
  const lowHbClause = `(
    (COALESCE(sex, '') = 'female' AND hb_level IS NOT NULL AND hb_level < 12.5)
    OR (COALESCE(sex, '') != 'female' AND hb_level IS NOT NULL AND hb_level < 13.0)
  )`;
  if (filters?.hbStatus === "low_hb") {
    sql += ` AND ${lowHbClause}`;
  } else if (filters?.hbStatus === "eligible") {
    sql += ` AND hb_level IS NOT NULL AND NOT ${lowHbClause}`;
  } else if (filters?.hbStatus === "not_tested") {
    sql += " AND hb_level IS NULL";
  }

  sql += " ORDER BY created_at DESC";

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  const countSql = sql
    .replace("SELECT *", "SELECT COUNT(*) as total")
    .replace(/ ORDER BY .*/, "")
    .replace(/ LIMIT .* OFFSET .*/, "");
  const countParams = filters?.limit ? params.slice(0, -2) : params;
  const total = db.prepare(countSql).get(...countParams) as { total: number };
  const rows = db.prepare(sql).all(...params);

  return { rows, total: total?.total || 0 };
}

/**
 * Returns donors pending identity verification (verification_status = 'pending'),
 * sorted by NID upload time (oldest first — FIFO review queue).
 * Optionally filter by district for district-scoped sub-admins.
 */
export function getPendingVerifications(filters?: {
  district?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  let sql = `
    SELECT id, full_name_en, full_name_bn, phone, blood_group, district, upazila,
           nid_number, nid_front_url, nid_back_url, nid_uploaded_at,
           verification_status, phone_verified, is_verified, created_at
    FROM profiles
    WHERE verification_status = 'pending' AND role = 'donor'
  `;
  const params: any[] = [];

  if (filters?.district) {
    sql += " AND district = ?";
    params.push(filters.district);
  }

  sql += " ORDER BY nid_uploaded_at ASC NULLS LAST";

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  return db.prepare(sql).all(...params);
}

export function getDonorApplications(filters?: {
  status?: "pending" | "approved" | "rejected" | "all";
  district?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  let sql = `
    SELECT id, full_name_en, full_name_bn, email, phone, whatsapp_number,
           blood_group, district, upazila, address, sex, date_of_birth,
           weight_kg, avatar_url, occupation, preferred_contact,
           hb_level, last_hb_test_date, last_donation_date,
           has_chronic_disease, disease_details,
           verification_status, verification_note, is_approved, created_at
    FROM profiles
    WHERE role = 'donor' AND is_approved = 0
  `;
  const params: any[] = [];

  if (filters?.district) {
    sql += " AND district = ?";
    params.push(filters.district);
  }

  if (filters?.search) {
    sql += " AND (full_name_en LIKE ? OR full_name_bn LIKE ? OR phone LIKE ? OR email LIKE ?)";
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }

  sql += " ORDER BY created_at DESC";

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  return db.prepare(sql).all(...params);
}

export function countDonorApplications(filters?: {
  district?: string;
  search?: string;
}) {
  const db = getDb();
  let sql = "SELECT COUNT(*) as count FROM profiles WHERE role = 'donor' AND is_approved = 0";
  const params: any[] = [];

  if (filters?.district) {
    sql += " AND district = ?";
    params.push(filters.district);
  }

  if (filters?.search) {
    sql += " AND (full_name_en LIKE ? OR full_name_bn LIKE ? OR phone LIKE ? OR email LIKE ?)";
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }

  return (db.prepare(sql).get(...params) as { count: number }).count;
}

export function getAdmins(filters?: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  let sql =
    "SELECT * FROM profiles WHERE role IN ('admin', 'super_admin')";
  const params: any[] = [];

  if (filters?.role && filters.role !== "all") {
    sql += " AND role = ?";
    params.push(filters.role);
  }
  if (filters?.search) {
    sql +=
      " AND (full_name_en LIKE ? OR full_name_bn LIKE ? OR phone LIKE ? OR email LIKE ?)";
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  sql += " ORDER BY created_at DESC";

  const countSql = sql
    .replace("SELECT *", "SELECT COUNT(*) as total")
    .replace(/ ORDER BY .*/, "");
  const countParams = [...params];

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  const total = db.prepare(countSql).get(...countParams) as { total: number };
  const rows = db.prepare(sql).all(...params);

  return { rows, total: total?.total || 0 };
}

// Blood Request queries

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRED_SEAL_DISPLAY_MS = DAY_MS;

export interface RequestLifecycleRow {
  id: number;
  when_needed: string;
  needed_date: string | null;
  needed_time: string | null;
  created_at: string;
  status?: string;
  fulfilled_at?: string | null;
  donated_at?: string | null;
  updated_at?: string | null;
}

/**
 * Compute the moment a request's needed time passes, based on
 * `when_needed` + `created_at` (+ `needed_date`/`needed_time` for
 * future-dated requests). Returns epoch ms, or NaN when unparseable.
 */
export function computeNeededExpiryMs(row: {
  when_needed: string;
  needed_date?: string | null;
  needed_time?: string | null;
  created_at: string;
}): number {
  const created = new Date(row.created_at);
  if (Number.isNaN(created.getTime())) return NaN;

  const endOfDay = (d: Date) => {
    const e = new Date(d);
    e.setHours(23, 59, 59, 999);
    return e.getTime();
  };

  switch (row.when_needed) {
    case "now":
    case "emergency":
      return created.getTime() + 6 * 60 * 60 * 1000;
    case "today":
      return endOfDay(created);
    case "tomorrow": {
      const d = new Date(created);
      d.setDate(d.getDate() + 1);
      return endOfDay(d);
    }
    case "day_after":
    case "day_after_tomorrow": {
      const d = new Date(created);
      d.setDate(d.getDate() + 2);
      return endOfDay(d);
    }
    case "within_3_days": {
      const d = new Date(created);
      d.setDate(d.getDate() + 3);
      return endOfDay(d);
    }
    case "within_week": {
      const d = new Date(created);
      d.setDate(d.getDate() + 7);
      return endOfDay(d);
    }
    case "specific_date": {
      if (row.needed_date) {
        const d = new Date(row.needed_date);
        if (!Number.isNaN(d.getTime())) {
          // Honour the requested clock time when provided.
          if (row.needed_time && /^\d{1,2}:\d{2}/.test(row.needed_time)) {
            const [h, m] = row.needed_time.split(":").map(Number);
            d.setHours(h || 0, m || 0, 0, 0);
            return d.getTime();
          }
          return endOfDay(d);
        }
      }
      return endOfDay(created);
    }
    default:
      return endOfDay(created);
  }
}

/**
 * Grace period (ms) a request stays visible AFTER its needed time passes,
 * shown pinned at the top as a "last chance". Future-dated requests get
 * 2 days; everything else gets 1 day. After the grace ends the request is
 * archived (hidden from frontend, kept forever for admin).
 */
export function getRequestGraceMs(row: { when_needed: string }): number {
  return row.when_needed === "specific_date" ? 2 * DAY_MS : 1 * DAY_MS;
}

/**
 * True when a request is in its "last chance" window: needed time has
 * passed but the grace period has not ended yet.
 */
export function isLastChanceRequest(
  row: {
    status?: string;
    when_needed: string;
    needed_date?: string | null;
    needed_time?: string | null;
    created_at: string;
  },
  nowMs: number = Date.now(),
): boolean {
  if (row.status !== "active") return false;
  const expiry = computeNeededExpiryMs(row);
  if (Number.isNaN(expiry)) return false;
  return nowMs > expiry && nowMs <= expiry + getRequestGraceMs(row);
}

/**
 * The moment a fulfilled request's "Completed" seal disappears from the
 * frontend: end of the day after it was marked fulfilled.
 */
export function getFulfilledSealHideMs(
  row: { fulfilled_at?: string | null; donated_at?: string | null; updated_at?: string | null },
): number {
  const base = row.fulfilled_at || row.donated_at || row.updated_at;
  if (!base) return NaN;
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return NaN;
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Request lifecycle sweep — replaces the old expireStaleBloodRequests.
 * Runs lazily on every read so listings stay fresh without a cron job.
 *
 *   active (needed time passed + grace over) → status='expired', archived
 *   fulfilled (seal window over)             → archived (reason 'fulfilled')
 *   archived > 48h                           → hard-deleted (QR window over)
 *
 * The QR code remains resolvable for 48h after closure (the track page shows
 * the terminal status), then the row is permanently purged.
 *
 * @param nowMs injectable clock for tests.
 * @returns number of requests archived by this sweep.
 */
export function runRequestLifecycleSweep(nowMs: number = Date.now()): number {
  const db = getDb();
  let archived = 0;

  // 1) Active requests whose needed time + grace period has passed.
  const active = db
    .prepare(
      "SELECT id, when_needed, needed_date, needed_time, created_at FROM blood_requests WHERE status = 'active' AND archived_at IS NULL",
    )
    .all() as Array<{
      id: number;
      when_needed: string;
      needed_date: string | null;
      needed_time: string | null;
      created_at: string;
    }>;

  const expireStmt = db.prepare(
    `UPDATE blood_requests
     SET status = 'expired', current_status = 'expired',
         updated_at = datetime('now')
     WHERE id = ? AND status = 'active' AND archived_at IS NULL`,
  );
  const logStmt = db.prepare(
    `INSERT INTO request_status_log (request_id, status, changed_by, note)
     VALUES (?, 'expired', 'system', 'Auto-expired after grace period')`,
  );

  for (const row of active) {
    const expiry = computeNeededExpiryMs(row);
    if (Number.isNaN(expiry)) continue;
    if (nowMs > expiry + getRequestGraceMs(row)) {
      if (expireStmt.run(row.id).changes > 0) {
        logStmt.run(row.id);
        archived++;
      }
    }
  }

  // 1b) Expired requests whose seal display window has ended — now archive.
  const expiredVisible = db
    .prepare(
      "SELECT id, when_needed, needed_date, needed_time, created_at FROM blood_requests WHERE status = 'expired' AND archived_at IS NULL",
    )
    .all() as Array<{
      id: number;
      when_needed: string;
      needed_date: string | null;
      needed_time: string | null;
      created_at: string;
    }>;

  const archiveExpiredStmt = db.prepare(
    `UPDATE blood_requests
     SET archived_at = datetime('now'), archive_reason = 'expired',
         updated_at = datetime('now')
     WHERE id = ? AND status = 'expired' AND archived_at IS NULL`,
  );

  for (const row of expiredVisible) {
    const expiry = computeNeededExpiryMs(row);
    if (Number.isNaN(expiry)) continue;
    if (nowMs > expiry + getRequestGraceMs(row) + EXPIRED_SEAL_DISPLAY_MS) {
      if (archiveExpiredStmt.run(row.id).changes > 0) {
        db.prepare("DELETE FROM request_translations WHERE request_id = ?").run(row.id);
        archived++;
      }
    }
  }

  // 2) Fulfilled requests whose "Completed" seal window has ended
  //    (visible until end of the day after fulfilment).
  const fulfilled = db
    .prepare(
      "SELECT id, fulfilled_at, donated_at, updated_at FROM blood_requests WHERE status = 'fulfilled' AND archived_at IS NULL",
    )
    .all() as Array<{
      id: number;
      fulfilled_at: string | null;
      donated_at: string | null;
      updated_at: string | null;
    }>;

  const archiveFulfilledStmt = db.prepare(
    `UPDATE blood_requests
     SET archived_at = datetime('now'), archive_reason = 'fulfilled',
         updated_at = datetime('now')
     WHERE id = ? AND status = 'fulfilled' AND archived_at IS NULL`,
  );

  for (const row of fulfilled) {
    const hideAt = getFulfilledSealHideMs(row);
    if (Number.isNaN(hideAt)) continue;
      if (nowMs > hideAt) {
        const changes = archiveFulfilledStmt.run(row.id).changes;
        if (changes > 0) {
          db.prepare("DELETE FROM request_translations WHERE request_id = ?").run(row.id);
          archived += changes;
        }
      }
    }

  // 3) Hard-delete rows archived more than 48h ago — the QR resolvability
  //    window has closed, so permanently remove them (cascades to logs,
  //    translations, donations).
  purgeOldArchivedRequests(48, nowMs);

  return archived;
}

/**
 * Hard-delete requests that were archived (expired / fulfilled / cancelled /
 * deleted) more than `retentionHours` ago. The QR code stays resolvable for
 * the retention window (the track page shows the terminal status), then the
 * row is permanently removed. Related rows (status logs, translations,
 * donations) cascade via ON DELETE CASCADE.
 *
 * @param retentionHours how long to keep archived rows before purging.
 * @param nowMs injectable clock for tests.
 * @returns number of requests hard-deleted by this purge.
 */
export function purgeOldArchivedRequests(
  retentionHours: number = 48,
  nowMs: number = Date.now(),
): number {
  const db = getDb();
  const cutoff = new Date(nowMs - retentionHours * 3_600_000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  const stale = db
    .prepare(
      `SELECT id FROM blood_requests
       WHERE archived_at IS NOT NULL AND archived_at < ?`,
    )
    .all(cutoff) as Array<{ id: number }>;

  if (stale.length === 0) return 0;

  const deleteStmt = db.prepare("DELETE FROM blood_requests WHERE id = ?");
  let purged = 0;
  for (const row of stale) {
    purged += deleteStmt.run(row.id).changes;
  }
  return purged;
}

export function getActiveBloodRequests(limit: number = 10) {
  runRequestLifecycleSweep();
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM blood_requests WHERE status = 'active' AND archived_at IS NULL ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit) as any[];
  const now = Date.now();
  return rows.map((r) => ({ ...r, is_last_chance: isLastChanceRequest(r, now) }));
}

// ── Nearby Blood Requests (chatbot "requesters near me") ────────────

export interface NearbyRequest {
  id: number;
  tracking_code: string;
  blood_group: string;
  units_needed: number;
  urgency_level: string;
  district: string;
  upazila: string | null;
  hospital_name: string | null;
  contact_number: string | null;
  needed_date: string | null;
  distance_km: number | null;
  created_at: string;
}

/**
 * Find active blood requests near a location for the chatbot.
 * Returns PUBLIC-SAFE fields only (no patient name, no emails).
 *
 * Sort priority: haversine distance when coords are available,
 * then same-district first, then newest.
 */
export function findRequestsNearby(
  lat?: number | null,
  lng?: number | null,
  district?: string,
  bloodGroup?: string,
  limit = 5,
): NearbyRequest[] {
  runRequestLifecycleSweep();
  const db = getDb();

  const hasCoords = typeof lat === "number" && typeof lng === "number"
    && Number.isFinite(lat) && Number.isFinite(lng);

  const conditions = ["status = 'active'", "archived_at IS NULL"];
  const params: unknown[] = [];
  if (bloodGroup && bloodGroup !== "ANY") {
    conditions.push("blood_group = ?");
    params.push(bloodGroup);
  }

  const rows = db
    .prepare(
      `SELECT id, tracking_code, blood_group, units_needed, urgency_level,
              district, upazila, hospital_name, contact_number,
              needed_date, lat, lng, created_at
       FROM blood_requests
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT 200`,
    )
    .all(...params) as any[];

  const origin = hasCoords
    ? { lat: lat as number, lng: lng as number }
    : district
      ? resolveCoords(null, null, district)
      : null;

  const districtLower = district?.toLowerCase() ?? null;

  const scored = rows.map((r) => {
    let distance: number | null = null;
    if (origin) {
      const reqCoords = resolveCoords(r.lat, r.lng, r.district, r.upazila);
      distance = Math.round(haversineKm(origin.lat, origin.lng, reqCoords.lat, reqCoords.lng) * 10) / 10;
    }
    const sameDistrict = districtLower
      ? (r.district ?? "").toLowerCase() === districtLower
      : false;
    const urgencyBoost = r.urgency_level === "critical" ? 2 : r.urgency_level === "urgent" ? 1 : 0;
    return { r, distance, sameDistrict, urgencyBoost };
  });

  scored.sort((a, b) => {
    // 1. distance (null distances last)
    if (a.distance !== null || b.distance !== null) {
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const dbv = b.distance ?? Number.POSITIVE_INFINITY;
      if (da !== dbv) return da - dbv;
    }
    // 2. same district
    if (a.sameDistrict !== b.sameDistrict) return a.sameDistrict ? -1 : 1;
    // 3. urgency
    if (a.urgencyBoost !== b.urgencyBoost) return b.urgencyBoost - a.urgencyBoost;
    // 4. newest
    return (b.r.created_at ?? "").localeCompare(a.r.created_at ?? "");
  });

  return scored.slice(0, limit).map(({ r, distance }) => ({
    id: r.id,
    tracking_code: r.tracking_code,
    blood_group: r.blood_group,
    units_needed: r.units_needed,
    urgency_level: r.urgency_level,
    district: r.district,
    upazila: r.upazila ?? null,
    hospital_name: r.hospital_name ?? null,
    contact_number: r.contact_number ?? null,
    needed_date: r.needed_date ?? null,
    distance_km: distance,
    created_at: r.created_at,
  }));
}

/**
 * Everything the public frontend is allowed to see:
 * active requests (incl. last-chance) + fulfilled requests still inside
 * their "Completed" seal window. Anything archived is frontend-invisible.
 */
export function getVisibleBloodRequests() {
  runRequestLifecycleSweep();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT br.*, COALESCE(d.total, 0) AS donated_units
       FROM blood_requests br
       LEFT JOIN (SELECT request_id, SUM(COALESCE(units, 1)) AS total FROM donations GROUP BY request_id) d
         ON d.request_id = br.id
       WHERE br.archived_at IS NULL ORDER BY br.created_at DESC`,
    )
    .all() as any[];
  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    is_last_chance: isLastChanceRequest(r, now),
  }));
}

/**
 * Per-status counts for the admin blood-requests tabs, including the
 * computed last-chance bucket and archive-reason buckets.
 */
export function getRequestStatusCounts() {
  runRequestLifecycleSweep();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, status, archive_reason, archived_at, when_needed,
              needed_date, needed_time, created_at
       FROM blood_requests`,
    )
    .all() as any[];

  const counts = {
    active: 0,
    lastChance: 0,
    fulfilled: 0,
    expired: 0,
    cancelled: 0,
    deleted: 0,
    all: rows.length,
  };
  const now = Date.now();
  for (const r of rows) {
    if (!r.archived_at && r.status === "active") {
      if (isLastChanceRequest(r, now)) counts.lastChance++;
      else counts.active++;
    } else if (r.archive_reason === "deleted_by_user") counts.deleted++;
    else if (r.status === "fulfilled") counts.fulfilled++;
    else if (r.status === "expired") counts.expired++;
    else if (r.status === "cancelled") counts.cancelled++;
  }
  return counts;
}

export type AdminRequestView =
  | "active"
  | "last_chance"
  | "fulfilled"
  | "expired"
  | "cancelled"
  | "deleted"
  | "all";

/**
 * Admin request listing with lifecycle-aware views. Last-chance is a
 * computed state (not a stored status), so filtering + pagination are
 * done in JS after computing flags — data volume is small.
 */
export function getAdminRequests(filters?: {
  view?: AdminRequestView;
  urgencyLevel?: string;
  bloodGroup?: string;
  search?: string;
  districts?: string[];
  limit?: number;
  offset?: number;
}) {
  runRequestLifecycleSweep();
  const db = getDb();
  let rows = db
    .prepare("SELECT * FROM blood_requests ORDER BY created_at DESC")
    .all() as any[];

  const now = Date.now();
  const view = filters?.view || "active";

  rows = rows.filter((r) => {
    const lastChance = isLastChanceRequest(r, now);
    switch (view) {
      case "active":
        if (r.archived_at || r.status !== "active" || lastChance) return false;
        break;
      case "last_chance":
        if (r.archived_at || !lastChance) return false;
        break;
      case "fulfilled":
        if (r.status !== "fulfilled") return false;
        break;
      case "expired":
        if (r.status !== "expired") return false;
        break;
      case "cancelled":
        if (r.status !== "cancelled" || r.archive_reason === "deleted_by_user")
          return false;
        break;
      case "deleted":
        if (r.archive_reason !== "deleted_by_user") return false;
        break;
      case "all":
      default:
        break;
    }
    if (
      filters?.urgencyLevel &&
      filters.urgencyLevel !== "all" &&
      r.urgency_level !== filters.urgencyLevel
    )
      return false;
    if (
      filters?.bloodGroup &&
      filters.bloodGroup !== "all" &&
      r.blood_group !== filters.bloodGroup
    )
      return false;
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      const hay = `${r.patient_name || ""} ${r.hospital_name || ""} ${r.contact_number || ""} ${r.tracking_code || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (filters?.districts && filters.districts.length > 0) {
      const allowed = filters.districts.map((d) => d.toLowerCase());
      if (!allowed.includes((r.district || "").toLowerCase())) return false;
    }
    return true;
  });

  const total = rows.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || rows.length;
  return {
    rows: rows.slice(offset, offset + limit).map((r) => ({
      ...r,
      is_last_chance: isLastChanceRequest(r, now),
    })),
    total,
  };
}

export function getAllBloodRequests() {
  runRequestLifecycleSweep();
  const db = getDb();
  return db
    .prepare("SELECT * FROM blood_requests ORDER BY created_at DESC")
    .all();
}

export function searchBloodRequests(filters?: {
  status?: string;
  urgencyLevel?: string;
  bloodGroup?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  // Lazily run the lifecycle sweep so listings reflect reality even when
  // accessed via search rather than the active-requests path.
  runRequestLifecycleSweep();
  const db = getDb();
  let sql = "SELECT * FROM blood_requests WHERE 1=1";
  const params: any[] = [];

  if (filters?.status && filters.status !== "all") {
    sql += " AND status = ?";
    params.push(filters.status);
  }
  if (filters?.urgencyLevel && filters.urgencyLevel !== "all") {
    sql += " AND urgency_level = ?";
    params.push(filters.urgencyLevel);
  }
  if (filters?.bloodGroup && filters.bloodGroup !== "all") {
    sql += " AND blood_group = ?";
    params.push(filters.bloodGroup);
  }
  if (filters?.search) {
    sql +=
      " AND (patient_name LIKE ? OR hospital_name LIKE ? OR contact_number LIKE ?)";
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  sql += " ORDER BY created_at DESC";

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  const countSql = sql
    .replace("SELECT *", "SELECT COUNT(*) as total")
    .replace(/ ORDER BY .*/, "")
    .replace(/ LIMIT .* OFFSET .*/, "");
  const countParams = filters?.limit ? params.slice(0, -2) : params;
  const total = db.prepare(countSql).get(...countParams) as { total: number };
  const rows = db.prepare(sql).all(...params);

  return { rows, total: total?.total || 0 };
}

export function createBloodRequest(request: Record<string, any>) {
  const db = getDb();
  // Resolve coordinates: prefer passed GPS, fall back to district/upazila centroid
  const coords = resolveCoords(
    request.lat,
    request.lng,
    request.district,
    request.upazila,
    request.unionName,
  );
  // Generate a unique tracking code for public status tracking.
  let trackingCode = generateTrackingCode();
  // Ensure uniqueness (extremely unlikely collision, but be safe)
  while (
    db
      .prepare("SELECT id FROM blood_requests WHERE tracking_code = ?")
      .get(trackingCode)
  ) {
    trackingCode = generateTrackingCode();
  }
  const stmt = db.prepare(`
    INSERT INTO blood_requests (requester_id, requester_type, patient_name, patient_age, blood_group, units_needed, urgency_level, when_needed, needed_date, needed_time, district, upazila, union_name, lat, lng, hospital_name, hospital_address, contact_number, alternative_number, whatsapp_number, reason, patient_hb_level, status, tracking_code, current_status, ip_address, user_agent)
    VALUES (@requesterId, @requesterType, @patientName, @patientAge, @bloodGroup, @unitsNeeded, @urgencyLevel, @whenNeeded, @neededDate, @neededTime, @district, @upazila, @unionName, @lat, @lng, @hospitalName, @hospitalAddress, @contactNumber, @alternativeNumber, @whatsappNumber, @reason, @patientHbLevel, @status, @trackingCode, @currentStatus, @ipAddress, @userAgent)
  `);
  const requestId = stmt.run({
    ...request,
    requesterId: request.requesterId ?? null,
    whatsappNumber: request.whatsappNumber ?? null,
    patientHbLevel: request.patientHbLevel ?? null,
    ipAddress: request.ipAddress ?? null,
    userAgent: request.userAgent ?? null,
    unionName: request.unionName ?? null,
    lat: coords.lat,
    lng: coords.lng,
    trackingCode,
    currentStatus: "submitted",
  }).lastInsertRowid as number;

  // Seed the initial status log entry so the timeline starts at "Submitted".
  db.prepare(
    `INSERT INTO request_status_log (request_id, status, changed_by, note)
     VALUES (?, ?, ?, ?)`,
  ).run(
    requestId,
    "submitted",
    request.requesterType || "guest",
    "Request submitted",
  );

  return requestId;
}

export function updateBloodRequest(id: number, data: Record<string, any>) {
  const db = getDb();
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(", ");
  const stmt = db.prepare(
    `UPDATE blood_requests SET ${fields}, updated_at = datetime('now') WHERE id = @id`,
  );
  return stmt.run({ ...data, id }).changes;
}

export function updateRequestStatus(id: number, status: string) {
  const db = getDb();
  // Cancelled requests vanish from the frontend immediately (soft-delete;
  // the record stays for admin history).
  if (status === "cancelled") {
    return db
      .prepare(
        `UPDATE blood_requests
         SET status = 'cancelled', current_status = 'cancelled',
             archived_at = COALESCE(archived_at, datetime('now')),
             archive_reason = COALESCE(archive_reason, 'cancelled'),
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(id).changes;
  }
  // Fulfilled requests keep showing with a "Completed" seal until end of
  // the next day; fulfilled_at starts that seal window.
  if (status === "fulfilled") {
    return db
      .prepare(
        `UPDATE blood_requests
         SET status = 'fulfilled', current_status = 'fulfilled',
             fulfilled_at = COALESCE(fulfilled_at, datetime('now')),
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(id).changes;
  }
  return db
    .prepare(
      "UPDATE blood_requests SET status = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(status, id).changes;
}

/**
 * Registered requester deletes their own request: instant frontend hide,
 * record kept for admin (archive_reason = 'deleted_by_user').
 * Returns 0 when the request doesn't exist or belongs to someone else.
 */
export function archiveOwnRequest(requestId: number, userId: number): number {
  const db = getDb();
  const req = db
    .prepare("SELECT requester_id, status FROM blood_requests WHERE id = ?")
    .get(requestId) as
    | { requester_id: number | null; status: string }
    | undefined;
  if (!req || req.requester_id == null || req.requester_id !== userId) return 0;

  const newStatus = req.status === "active" ? "cancelled" : req.status;
  const changes = db
    .prepare(
      `UPDATE blood_requests
       SET status = ?, archived_at = datetime('now'),
           archive_reason = 'deleted_by_user', updated_at = datetime('now')
       WHERE id = ? AND archived_at IS NULL`,
    )
    .run(newStatus, requestId).changes;

  if (changes > 0) {
    db.prepare("DELETE FROM request_translations WHERE request_id = ?").run(requestId);
    db.prepare(
      `INSERT INTO request_status_log (request_id, status, changed_by, note)
       VALUES (?, 'cancelled', 'requester', 'Deleted by requester')`,
    ).run(requestId);
  }
  return changes;
}

/**
 * Requests owned by a registered user (for the profile "My Requests"
 * section) — includes everything, newest first.
 */
export function getBloodRequestsByRequester(userId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM blood_requests
       WHERE requester_id = ?
       ORDER BY created_at DESC`,
    )
    .all(userId);
}

export function getBloodRequestsByHospital(hospitalNameEn: string, hospitalNameBn?: string) {
  const db = getDb();
  const patterns = [hospitalNameEn];
  if (hospitalNameBn && hospitalNameBn !== hospitalNameEn) patterns.push(hospitalNameBn);
  const placeholders = patterns.map(() => "hospital_name LIKE ?").join(" OR ");
  const params = patterns.flatMap((p) => [`%${p}%`]);
  return db
    .prepare(
      `SELECT * FROM blood_requests
       WHERE (${placeholders})
       ORDER BY created_at DESC`,
    )
    .all(...params);
}

export function getDonationsByHospital(hospitalNameEn: string, hospitalNameBn?: string) {
  const db = getDb();
  const patterns = [hospitalNameEn];
  if (hospitalNameBn && hospitalNameBn !== hospitalNameEn) patterns.push(hospitalNameBn);
  const placeholders = patterns.map(() => "hospital_name LIKE ?").join(" OR ");
  const params = patterns.flatMap((p) => [`%${p}%`]);
  return db
    .prepare(
      `SELECT d.*, p.full_name_en as donor_name, p.phone as donor_phone, p.blood_group as donor_blood_group
       FROM donations d
       LEFT JOIN profiles p ON d.donor_id = p.id
       WHERE (${placeholders})
       ORDER BY d.donation_date DESC`,
    )
    .all(...params);
}

export function getHospitalStats(hospitalNameEn: string, hospitalNameBn?: string) {
  const db = getDb();
  const patterns = [hospitalNameEn];
  if (hospitalNameBn && hospitalNameBn !== hospitalNameEn) patterns.push(hospitalNameBn);
  const ph = patterns.map(() => "hospital_name LIKE ?").join(" OR ");
  const params = patterns.flatMap((p) => [`%${p}%`]);

  const totalRequests = (db.prepare(
    `SELECT COUNT(*) as cnt FROM blood_requests WHERE (${ph})`,
  ).get(...params) as any)?.cnt || 0;

  const activeRequests = (db.prepare(
    `SELECT COUNT(*) as cnt FROM blood_requests WHERE (${ph}) AND status = 'active' AND archived_at IS NULL`,
  ).get(...params) as any)?.cnt || 0;

  const fulfilledRequests = (db.prepare(
    `SELECT COUNT(*) as cnt FROM blood_requests WHERE (${ph}) AND status = 'fulfilled'`,
  ).get(...params) as any)?.cnt || 0;

  const totalDonations = (db.prepare(
    `SELECT COUNT(*) as cnt FROM donations WHERE (${ph})`,
  ).get(...params) as any)?.cnt || 0;

  const totalUnits = (db.prepare(
    `SELECT COALESCE(SUM(units), 0) as sum FROM donations WHERE (${ph})`,
  ).get(...params) as any)?.sum || 0;

  return { totalRequests, activeRequests, fulfilledRequests, totalDonations, totalUnits };
}

export function deleteRequest(id: number) {
  const db = getDb();
  return db.prepare("DELETE FROM blood_requests WHERE id = ?").run(id).changes;
}

// ── Donor-facing request discovery & owner request management ─────────

/** Patient blood groups that a donor with the given group can safely donate to. */
const DONOR_CAN_DONATE_TO: Record<string, string[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/**
 * Active blood requests that a donor with the given blood group could
 * fulfill. Used by the donor profile "Nearby Requests" section; ranking
 * (district/urgency) happens in the server action layer.
 */
export function getActiveRequestsForDonor(
  donorBloodGroup: string,
  limit = 50,
) {
  const db = getDb();
  const groups = DONOR_CAN_DONATE_TO[donorBloodGroup] || [donorBloodGroup];
  const placeholders = groups.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT * FROM blood_requests
       WHERE archived_at IS NULL AND status = 'active'
         AND blood_group IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(...groups, limit) as any[];
}

/** Total units already collected for a request (from linked donations). */
export function getRequestCollectedUnits(requestId: number): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(units), 0) AS collected FROM donations WHERE request_id = ?",
    )
    .get(requestId) as any;
  return row?.collected ?? 0;
}

const OWN_REQUEST_EDITABLE_FIELDS = [
  "patient_name",
  "patient_age",
  "units_needed",
  "urgency_level",
  "when_needed",
  "needed_date",
  "needed_time",
  "hospital_name",
  "hospital_address",
  "contact_number",
  "alternative_number",
  "reason",
  "patient_hb_level",
] as const;

/**
 * Registered requester edits their own active request. Only whitelisted
 * fields are updated, and only while the request is still active and not
 * archived. Returns the number of changed rows (0 = not allowed).
 */
export function updateOwnBloodRequest(
  requestId: number,
  userId: number,
  data: Record<string, any>,
): number {
  const db = getDb();
  const req = db
    .prepare(
      "SELECT * FROM blood_requests WHERE id = ? AND requester_id = ? AND status = 'active' AND archived_at IS NULL",
    )
    .get(requestId, userId) as any | undefined;
  if (!req) return 0;

  const sets: string[] = [];
  const values: any[] = [];
  const newValues: Record<string, any> = {};
  for (const field of OWN_REQUEST_EDITABLE_FIELDS) {
    if (field in data) {
      sets.push(`${field} = ?`);
      values.push(data[field]);
      newValues[field] = data[field];
    }
  }
  if (sets.length === 0) return 0;
  sets.push("updated_at = datetime('now')");
  const changes = db
    .prepare(
      `UPDATE blood_requests SET ${sets.join(", ")}
       WHERE id = ? AND requester_id = ? AND status = 'active' AND archived_at IS NULL`,
    )
    .run(...values, requestId, userId).changes;

  if (changes > 0) {
    const previousValues: Record<string, any> = {};
    for (const field of Object.keys(newValues)) {
      previousValues[field] = (req as any)[field];
    }
    recordRequestEditHistory({
      requestId,
      editorType: "user",
      editorId: userId,
      previousValues,
      newValues,
    });
  }
  return changes;
}

/**
 * Guest (unregistered) requester edits their own active blood request.
 * Authorization is based on matching the stored ip_address OR user_agent
 * with the current visitor's fingerprint — no user session required.
 * Only the same whitelisted fields as the registered-owner flow are
 * updatable. Returns the number of changed rows (0 = not allowed).
 */
export function updateGuestBloodRequest(
  requestId: number,
  visitorIp: string,
  visitorUa: string,
  data: Record<string, any>,
): number {
  const db = getDb();
  const req = db
    .prepare(
      "SELECT * FROM blood_requests WHERE id = ?",
    )
    .get(requestId) as any | undefined;

  if (!req) return 0;
  if (req.requester_id != null) return 0;
  if (req.status !== "active" || req.archived_at != null) return 0;

  const ipMatch =
    !!req.ip_address &&
    req.ip_address !== "unknown" &&
    req.ip_address === visitorIp;
  const uaMatch =
    !!req.user_agent &&
    req.user_agent !== "unknown" &&
    req.user_agent === visitorUa;
  if (!ipMatch && !uaMatch) return 0;

  const sets: string[] = [];
  const values: any[] = [];
  const newValues: Record<string, any> = {};
  for (const field of OWN_REQUEST_EDITABLE_FIELDS) {
    if (field in data) {
      sets.push(`${field} = ?`);
      values.push(data[field]);
      newValues[field] = data[field];
    }
  }
  if (sets.length === 0) return 0;
  sets.push("updated_at = datetime('now')");
  const changes = db
    .prepare(
      `UPDATE blood_requests SET ${sets.join(", ")}
       WHERE id = ? AND requester_id IS NULL AND status = 'active' AND archived_at IS NULL`,
    )
    .run(...values, requestId).changes;

  if (changes > 0) {
    const previousValues: Record<string, any> = {};
    for (const field of Object.keys(newValues)) {
      previousValues[field] = (req as any)[field];
    }
    recordRequestEditHistory({
      requestId,
      editorType: "guest",
      editorIp: visitorIp,
      previousValues,
      newValues,
    });
  }
  return changes;
}

/**
 * Guest (unregistered) requester cancels their own active blood request.
 * Same IP/user-agent authorization as updateGuestBloodRequest.
 * Returns the number of changed rows (0 = not allowed).
 */
export function archiveGuestRequest(
  requestId: number,
  visitorIp: string,
  visitorUa: string,
): number {
  const db = getDb();
  const req = db
    .prepare(
      "SELECT requester_id, ip_address, user_agent, status, archived_at FROM blood_requests WHERE id = ?",
    )
    .get(requestId) as
    | {
        requester_id: number | null;
        ip_address: string | null;
        user_agent: string | null;
        status: string;
        archived_at: string | null;
      }
    | undefined;

  if (!req) return 0;
  if (req.requester_id != null) return 0;
  if (req.status !== "active" || req.archived_at != null) return 0;

  const ipMatch =
    !!req.ip_address &&
    req.ip_address !== "unknown" &&
    req.ip_address === visitorIp;
  const uaMatch =
    !!req.user_agent &&
    req.user_agent !== "unknown" &&
    req.user_agent === visitorUa;
  if (!ipMatch && !uaMatch) return 0;

  const changes = db
    .prepare(
      `UPDATE blood_requests
       SET status = 'cancelled', archived_at = datetime('now'),
           archive_reason = 'cancelled_by_guest', updated_at = datetime('now')
       WHERE id = ? AND requester_id IS NULL AND archived_at IS NULL`,
    )
    .run(requestId).changes;

  if (changes > 0) {
    db.prepare(
      `INSERT INTO request_status_log (request_id, status, changed_by, note)
       VALUES (?, 'cancelled', 'guest', 'Cancelled by guest requester')`,
    ).run(requestId);
  }
  return changes;
}

// ── Request edit history ─────────────────────────────────────────────

/**
 * Records a single edit event in request_edit_history and bumps
 * blood_requests.edit_count / edited_at. Called after a successful
 * update by a guest, registered user, or admin.
 */
export function recordRequestEditHistory(entry: {
  requestId: number;
  editorType: "guest" | "user" | "admin";
  editorId?: number | null;
  editorEmail?: string | null;
  editorIp?: string | null;
  editorName?: string | null;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
}): void {
  const db = getDb();
  const changedFields = Object.keys(entry.newValues).filter(
    (k) =>
      JSON.stringify(entry.previousValues[k] ?? null) !==
      JSON.stringify(entry.newValues[k] ?? null),
  );
  if (changedFields.length === 0) return;

  db.prepare(
    `INSERT INTO request_edit_history
       (request_id, editor_type, editor_id, editor_email, editor_ip, editor_name,
        previous_values, new_values, changed_fields)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    entry.requestId,
    entry.editorType,
    entry.editorId ?? null,
    entry.editorEmail ?? null,
    entry.editorIp ?? null,
    entry.editorName ?? null,
    JSON.stringify(entry.previousValues),
    JSON.stringify(entry.newValues),
    JSON.stringify(changedFields),
  );

  db.prepare(
    `UPDATE blood_requests
     SET edited_at = datetime('now'), edit_count = COALESCE(edit_count, 0) + 1
     WHERE id = ?`,
  ).run(entry.requestId);
}

/** Returns the full edit history for a request, newest first. */
export function getRequestEditHistory(requestId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM request_edit_history WHERE request_id = ? ORDER BY created_at DESC`,
    )
    .all(requestId) as Array<{
    id: number;
    request_id: number;
    editor_type: string;
    editor_id: number | null;
    editor_email: string | null;
    editor_ip: string | null;
    editor_name: string | null;
    previous_values: string;
    new_values: string;
    changed_fields: string;
    created_at: string;
  }>;
}

// ── Request translations (pre-computed Bengali share text) ──────────

export function saveRequestTranslation(requestId: number, bnText: string, bnFields?: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO request_translations (request_id, bn_text, bn_fields) VALUES (?, ?, ?)
     ON CONFLICT(request_id) DO UPDATE SET bn_text = excluded.bn_text, bn_fields = excluded.bn_fields, created_at = datetime('now')`,
  ).run(requestId, bnText, bnFields ?? null);
}

export function getRequestTranslation(requestId: number): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT bn_text FROM request_translations WHERE request_id = ?")
    .get(requestId) as { bn_text: string } | undefined;
  return row?.bn_text ?? null;
}

export function getRequestTranslationFields(requestId: number): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT bn_fields FROM request_translations WHERE request_id = ?")
    .get(requestId) as { bn_fields: string | null } | undefined;
  return row?.bn_fields ?? null;
}

export function deleteRequestTranslation(requestId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM request_translations WHERE request_id = ?").run(requestId);
}

/**
 * Registered requester marks their own active request as fulfilled
 * (no donor attribution — unlike the admin flow). Returns changed rows.
 */
export function markOwnRequestFulfilled(
  requestId: number,
  userId: number,
): number {
  const db = getDb();
  const changes = db
    .prepare(
      `UPDATE blood_requests
       SET status = 'fulfilled', current_status = 'fulfilled',
           donated_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND requester_id = ? AND status = 'active' AND archived_at IS NULL`,
    )
    .run(requestId, userId).changes;
  if (changes > 0) {
    addStatusLog(requestId, "fulfilled", "requester", "Marked fulfilled by requester");
  }
  return changes;
}

/**
 * Boost an own active request: stamps boosted_at (rate-limited to once per
 * 24h) and bumps updated_at so the request resurfaces in feeds. Returns
 * changed rows (0 = not allowed / on cooldown).
 */
export function boostOwnRequest(requestId: number, userId: number): number {
  const db = getDb();
  return db
    .prepare(
      `UPDATE blood_requests
       SET boosted_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND requester_id = ? AND status = 'active' AND archived_at IS NULL
         AND (boosted_at IS NULL OR boosted_at < datetime('now', '-1 day'))`,
    )
    .run(requestId, userId).changes;
}

// ── Saved patient profiles ────────────────────────────────────────────

export function createSavedPatient(patient: {
  ownerId: number;
  name: string;
  age?: number | null;
  bloodGroup?: string | null;
  relation?: string | null;
  conditionNote?: string | null;
}): number {
  const db = getDb();
  return Number(
    db
      .prepare(
        `INSERT INTO saved_patients (owner_id, name, age, blood_group, relation, condition_note)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        patient.ownerId,
        patient.name,
        patient.age ?? null,
        patient.bloodGroup ?? null,
        patient.relation ?? null,
        patient.conditionNote ?? null,
      ).lastInsertRowid,
  );
}

export function getSavedPatients(ownerId: number) {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM saved_patients WHERE owner_id = ? ORDER BY created_at ASC",
    )
    .all(ownerId);
}

export function deleteSavedPatient(id: number, ownerId: number): number {
  const db = getDb();
  return db
    .prepare("DELETE FROM saved_patients WHERE id = ? AND owner_id = ?")
    .run(id, ownerId).changes;
}

// ── Smart Donor Matching ──────────────────────────────────────────────

/**
 * Blood type compatibility chart. Given a patient's blood group, returns
 * the list of donor blood groups that can safely donate.
 */
const COMPATIBLE_DONORS: Record<string, string[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "ANY": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

export interface DonorMatch {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  lat: number | null;
  lng: number | null;
  last_donation_date: string | null;
  is_eligible: number;
  total_donations: number;
  match_rank: number;
  match_score: number;
  match_reasons: string[];
  distance_km: number | null;
  hb_level?: number | null;
}

/**
 * Find and rank eligible donors for a blood request.
 *
 * Ranking factors (in priority order):
 *   1. Exact blood group match > compatible group
 *   2. Same district > same division
 *   3. Proximity (Haversine distance in km)
 *   4. Last donation date (longer gap = higher rank)
 *
 * @param bloodGroup  Patient's required blood group
 * @param district    Request district (for proximity matching)
 * @param upazila     Request upazila (optional, for finer proximity)
 * @param urgencyLevel  When critical, returns more donors
 * @param limit       Max number of donors to return (default 10 for critical, 5 otherwise)
 */
export function findMatchingDonors(
  bloodGroup: string,
  district?: string,
  upazila?: string,
  urgencyLevel: string = "normal",
  limit?: number,
  requestLat?: number | null,
  requestLng?: number | null,
  exactMatch?: boolean,
): DonorMatch[] {
  const db = getDb();

  const compatibleGroups = exactMatch
    ? [bloodGroup]
    : COMPATIBLE_DONORS[bloodGroup] || [bloodGroup];
  const maxResults = limit || (urgencyLevel === "critical" ? 10 : 5);

  const reqCoords = resolveCoords(requestLat, requestLng, district, upazila);

  // Fetch all eligible donors with a compatible blood group
  const placeholders = compatibleGroups.map(() => "?").join(",");
  const donors = db
    .prepare(
      `
      WITH per_type AS (
        SELECT
          donor_id,
          MAX(CASE WHEN donation_type = 'whole_blood' OR donation_type IS NULL THEN donation_date END) as last_wb,
          MAX(CASE WHEN donation_type = 'platelets' THEN donation_date END) as last_pl,
          MAX(CASE WHEN donation_type = 'plasma' THEN donation_date END) as last_pm
        FROM donations GROUP BY donor_id
      )
      SELECT p.id, p.full_name_en, p.full_name_bn, p.phone, p.whatsapp_number,
             p.blood_group, p.district, p.upazila, p.lat, p.lng,
             p.last_donation_date, p.hb_level,
             CASE WHEN p.is_active != 1 THEN 0
               WHEN (p.sex = 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 12.5)
                 OR (p.sex != 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 13.0) THEN 0
               WHEN COALESCE(pt.last_wb, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND COALESCE(p.last_donation_type,'whole_blood') = 'whole_blood' THEN p.last_donation_date END) IS NULL THEN 1
               WHEN (julianday('now') - julianday(COALESCE(pt.last_wb, p.last_donation_date))) >= 90 THEN 1
               WHEN COALESCE(pt.last_pl, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'platelets' THEN p.last_donation_date END) IS NULL THEN 1
               WHEN (julianday('now') - julianday(COALESCE(pt.last_pl, p.last_donation_date))) >= 14 THEN 1
               WHEN COALESCE(pt.last_pm, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'plasma' THEN p.last_donation_date END) IS NULL THEN 1
               WHEN (julianday('now') - julianday(COALESCE(pt.last_pm, p.last_donation_date))) >= 30 THEN 1
               ELSE 0
             END as is_eligible,
             COALESCE(d.donation_count, 0) as total_donations
      FROM profiles p
      LEFT JOIN per_type pt ON p.id = pt.donor_id
      LEFT JOIN (
        SELECT donor_id, COUNT(*) as donation_count
        FROM donations GROUP BY donor_id
      ) d ON p.id = d.donor_id
      WHERE p.role = 'donor'
        AND p.is_active = 1
        AND p.is_approved = 1
        AND p.blood_group IN (${placeholders})
        AND p.full_name_en IS NOT NULL AND p.full_name_en != ''
        AND p.phone IS NOT NULL AND p.phone != ''
        AND NOT (
          (p.sex = 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 12.5)
          OR (p.sex != 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 13.0)
        )
      `,
    )
    .all(...compatibleGroups) as any[];

  // Score and rank each donor
  const scored: DonorMatch[] = donors
    .filter((d) => d.is_eligible === 1)
    .map((d) => {
      const reasons: string[] = [];
      if (d.hb_level == null) reasons.push("hb_not_tested");
      let score = 0;

      // 1. Exact blood group match (highest weight)
      if (d.blood_group === bloodGroup) {
        score += 100;
        reasons.push("exact_blood_match");
      } else {
        score += 40;
        reasons.push("compatible_blood");
      }

      // 2. District match
      if (district && d.district === district) {
        score += 30;
        reasons.push("same_district");
      }

      // 3. Distance (Haversine)
      const donorCoords = resolveDonorCoords(
        d.lat,
        d.lng,
        d.upazila,
        d.district,
        d.union_name,
      );
      const distance = haversineKm(
        reqCoords.lat,
        reqCoords.lng,
        donorCoords.lat,
        donorCoords.lng,
      );
      // Closer = higher score (max 20 points if < 5km, scaling down)
      if (distance < 5) score += 20;
      else if (distance < 15) score += 15;
      else if (distance < 30) score += 10;
      else if (distance < 50) score += 5;

      // 4. Last donation gap (longer gap = better, max 10 points)
      if (!d.last_donation_date) {
        score += 10;
        reasons.push("never_donated");
      } else {
        const daysSince = Math.floor(
          (Date.now() - new Date(d.last_donation_date).getTime()) / 86400000,
        );
        if (daysSince >= 90) score += 10;
        else if (daysSince >= 30) score += 7;
        else if (daysSince >= 14) score += 4;
      }

      return {
        ...d,
        match_rank: 0, // assigned after sorting
        match_score: score,
        match_reasons: reasons,
        distance_km: Math.round(distance * 10) / 10,
        lat: donorCoords.lat,
        lng: donorCoords.lng,
      };
    });

  const ranked = rankDonorCandidates(
    scored.map((donor) => ({
      ...donor,
      hbStatus: donor.hb_level == null ? "not_tested" : "eligible",
      distanceKm: donor.distance_km,
      baseScore: donor.match_score,
    })),
    urgencyLevel,
  );

  return ranked
    .slice(0, maxResults)
    .map(({ hbStatus: _hbStatus, distanceKm: _distanceKm, baseScore: _baseScore, ...donor }, idx) => ({
      ...donor,
      match_rank: idx + 1,
    }));

}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Donor Match Recording ─────────────────────────────────────────────

/**
 * Record that a set of donors was notified for a request.
 * Creates donor_matches rows for tracking response status.
 */
export function recordDonorMatches(
  requestId: number,
  matches: DonorMatch[],
  method: string = "sms",
): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO donor_matches (request_id, donor_id, match_rank, match_score, notification_method)
    VALUES (?, ?, ?, ?, ?)
  `);
  let count = 0;
  for (const m of matches) {
    stmt.run(requestId, m.id, m.match_rank, m.match_score, method);
    count++;
  }
  return count;
}

/**
 * Update a donor's response status for a specific request.
 * Also records the response time (responded_at - created_at) in the
 * donor's profile (response_count, response_total_ms) for presence metrics.
 */
export function updateDonorMatchResponse(
  requestId: number,
  donorId: number,
  responseStatus: "accepted" | "declined" | "no_response",
): number {
  const db = getDb();

  // Fetch the match row to compute response time.
  const matchRow = db
    .prepare(
      "SELECT created_at FROM donor_matches WHERE request_id = ? AND donor_id = ?",
    )
    .get(requestId, donorId) as { created_at: string } | undefined;

  const changes = db
    .prepare(
      `UPDATE donor_matches
       SET response_status = ?, responded_at = datetime('now')
       WHERE request_id = ? AND donor_id = ?`,
    )
    .run(responseStatus, requestId, donorId).changes;

  // Record response time on the donor's profile for accepted/declined only.
  if (changes > 0 && matchRow && (responseStatus === "accepted" || responseStatus === "declined")) {
    try {
      const createdAtMs = new Date(
        matchRow.created_at.includes("T")
          ? matchRow.created_at
          : matchRow.created_at.replace(" ", "T") + "Z",
      ).getTime();
      const responseMs = Date.now() - createdAtMs;
      if (responseMs > 0 && responseMs < 30 * 24 * 60 * 60 * 1000) {
        db.prepare(
          `UPDATE profiles
           SET response_count = COALESCE(response_count, 0) + 1,
               response_total_ms = COALESCE(response_total_ms, 0) + ?
           WHERE id = ?`,
        ).run(Math.round(responseMs), donorId);
      }
    } catch {
      /* best-effort — don't fail the response update */
    }
  }

  return changes;
}

/**
 * Get all donor match records for a request.
 */
export function getDonorMatchesForRequest(requestId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT dm.*, p.full_name_en, p.full_name_bn, p.phone, p.whatsapp_number,
              p.blood_group, p.district, p.upazila
       FROM donor_matches dm
       JOIN profiles p ON dm.donor_id = p.id
       WHERE dm.request_id = ?
       ORDER BY dm.match_rank ASC`,
    )
    .all(requestId);
}

// ── Request Status Log ────────────────────────────────────────────────

/**
 * The extended status lifecycle for tracking:
 * submitted → matching → donor_found → donating → fulfilled / cancelled / expired
 */
export const REQUEST_STATUSES = [
  "submitted",
  "matching",
  "donor_found",
  "donating",
  "fulfilled",
  "cancelled",
  "expired",
] as const;

/**
 * Add a status log entry for a blood request and update its current_status.
 */
export function addStatusLog(
  requestId: number,
  status: string,
  changedBy?: string,
  note?: string,
): number {
  const db = getDb();
  db.prepare(
    `INSERT INTO request_status_log (request_id, status, changed_by, note)
     VALUES (?, ?, ?, ?)`,
  ).run(requestId, status, changedBy || null, note || null);

  return db
    .prepare(
      `UPDATE blood_requests SET current_status = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .run(status, requestId).changes;
}

/**
 * Get the full status history for a request, ordered newest-first.
 */
export function getStatusLogs(requestId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM request_status_log
       WHERE request_id = ?
       ORDER BY created_at ASC`,
    )
    .all(requestId);
}

/**
 * Get a blood request by its tracking code.
 */
export function getBloodRequestByTrackingCode(code: string) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM blood_requests WHERE tracking_code = ?")
    .get(code) as Record<string, any> | undefined;
}

/**
 * Get a blood request by ID (full record).
 */
export function getBloodRequestById(id: number) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM blood_requests WHERE id = ?")
    .get(id) as Record<string, any> | undefined;
}

export function incrementRequestView(id: number): number {
  const db = getDb();
  const result = db
    .prepare("UPDATE blood_requests SET view_count = view_count + 1 WHERE id = ?")
    .run(id);
  return result.changes;
}

/**
 * Generate a human-readable tracking code: REQ-XXXXXX (alphanumeric).
 */
export function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REQ-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Donation queries
export function createDonation(donation: Record<string, any>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO donations (donor_id, request_id, blood_group, units, hospital_name, donation_date, donation_type, recipient_type, referrer_profile_id, referrer_name, referrer_phone)
    VALUES (@donorId, @requestId, @bloodGroup, @units, @hospitalName, @donationDate, @donationType, @recipientType, @referrerProfileId, @referrerName, @referrerPhone)
  `);
  const result = stmt.run({
    referrerProfileId: null,
    referrerName: null,
    referrerPhone: null,
    ...donation,
  });
  if (donation.donorId && donation.donationDate) {
    db.prepare(
      `
      UPDATE profiles 
      SET last_donation_date = MAX(@donationDate, NULLIF(last_donation_date, '')),
          last_donation_type = COALESCE(@donationType, 'whole_blood')
      WHERE id = @donorId
        AND (@donationDate >= COALESCE(NULLIF(last_donation_date, ''), '0000-01-01'))
    `,
    ).run({
      donorId: donation.donorId,
      donationDate: donation.donationDate,
      donationType: donation.donationType || "whole_blood",
    });
  }
  // Propagate the referrer onto the linked blood request so admins and the
  // request record can see who helped find the donor.
  const hasReferrer =
    donation.referrerProfileId != null ||
    (donation.referrerName && String(donation.referrerName).trim() !== "");
  if (donation.requestId && hasReferrer) {
    db.prepare(
      `UPDATE blood_requests
       SET referrer_profile_id = @referrerProfileId,
           referrer_name = @referrerName,
           referrer_phone = @referrerPhone,
           updated_at = datetime('now')
       WHERE id = @requestId`,
    ).run({
      referrerProfileId: donation.referrerProfileId ?? null,
      referrerName: donation.referrerName ?? null,
      referrerPhone: donation.referrerPhone ?? null,
      requestId: donation.requestId,
    });
  }
  return result.lastInsertRowid as number;
}

export function getDonationsByDonorId(donorId: number) {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM donations WHERE donor_id = ? ORDER BY donation_date DESC",
    )
    .all(donorId);
}

export function getAllDonations() {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT 
      d.*,
      p.full_name_en as donor_name,
      p.phone as donor_phone,
      br.patient_name,
      rp.full_name_en as referrer_profile_name
    FROM donations d
    LEFT JOIN profiles p ON d.donor_id = p.id
    LEFT JOIN blood_requests br ON d.request_id = br.id
    LEFT JOIN profiles rp ON d.referrer_profile_id = rp.id
    ORDER BY d.donation_date DESC
  `,
    )
    .all();
}

// ─────────────────────────────────────────────────────────────────────────
// Social community feed
// ─────────────────────────────────────────────────────────────────────────

export type SocialPostType =
  | "general"
  | "donation_update"
  | "admin_announcement"
  | "blood_request";

export interface SocialPostInput {
  authorId: number;
  authorRole: string;
  content: string;
  images?: string[];
  postType?: SocialPostType;
  relatedRequestId?: number | null;
  isPublic?: boolean;
}

/** Urgency weights used by the feed ranking algorithm. */
const URGENCY_WEIGHT: Record<string, number> = {
  critical: 3,
  urgent: 2.5,
  high: 2,
  normal: 1.5,
  low: 1,
};

export function createSocialPost(input: SocialPostInput): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO social_posts
      (author_id, author_role, content, images, post_type, related_request_id, is_public, created_at, updated_at)
    VALUES
      (@authorId, @authorRole, @content, @images, @postType, @relatedRequestId, @isPublic, datetime('now'), datetime('now'))
  `);
  return stmt.run({
    authorId: input.authorId,
    authorRole: input.authorRole,
    content: input.content,
    images:
      input.images && input.images.length
        ? JSON.stringify(input.images)
        : null,
    postType: input.postType || "general",
    relatedRequestId: input.relatedRequestId ?? null,
    isPublic: input.isPublic === false ? 0 : 1,
  }).lastInsertRowid as number;
}

/** Map a raw social_posts row (+ joined counts) into a normalized object. */
function mapSocialPostRow(r: any, viewerId: number | null) {
  return {
    kind: "post" as const,
    id: r.id,
    postId: r.id,
    authorId: r.author_id,
    authorName: r.author_name || "User",
    authorRole: r.author_role,
    authorAvatarUrl: r.author_avatar_url || null,
    content: r.content,
    images: r.images ? JSON.parse(r.images) : [],
    postType: r.post_type,
    relatedRequestId: r.related_request_id,
    pinned: !!r.pinned,
    isPublic: !!r.is_public,
    status: r.status,
    likeCount: r.like_count || 0,
    commentCount: r.comment_count || 0,
    shareCount: r.share_count || 0,
    likedByMe: viewerId ? r.my_like > 0 : false,
    saveCount: r.save_count || 0,
    savedByMe: viewerId ? r.my_save > 0 : false,
    viewCount: r.view_count || 0,
    createdAt: r.created_at,
  };
}

export interface FeedFilter {
  viewerId?: number | null;
  isAdmin?: boolean;
  limit?: number;
  offset?: number;
  filter?: "all" | "updates" | "requests" | "announcements";
}

/**
 * The feed ranking algorithm.
 *
 * Every feed item (post or blood request) gets a score combining:
 *   • recency  — newer items score higher, decaying over ~24h half-life
 *   • type     — admin announcements & urgent blood requests float up,
 *                donor donation updates rank above generic posts
 *   • urgency  — critical/urgent requests get a large boost, last-chance
 *                requests get an extra penalty so they surface immediately
 *   • engagement — likes / comments / shares give a small live boost
 * Pinned posts are always forced to the very top (by recency among pins).
 */
function scoreFeedItem(item: any): number {
  const createdMs = item.createdAt
    ? new Date(String(item.createdAt).replace(" ", "T") + "Z").getTime()
    : Date.now();
  const ageHours = Math.max(0, (Date.now() - createdMs) / 3_600_000);
  const recency = 1 / (1 + ageHours / 24); // 1.0 when fresh → ~0 over days

  let typeBoost = 1;
  if (item.kind === "request") {
    const u = String(item.urgency || "normal").toLowerCase();
    typeBoost = 1.4 + (URGENCY_WEIGHT[u] || 1);
    if (item.isLastChance) typeBoost += 1.5;
  } else if (item.postType === "admin_announcement") {
    typeBoost = 3;
  } else if (item.postType === "donation_update") {
    typeBoost = 1.8;
  }

  const engagement =
    (item.likeCount || 0) * 0.4 +
    (item.commentCount || 0) * 0.6 +
    (item.shareCount || 0) * 0.2;

  return recency * typeBoost + engagement * 0.05;
}

/**
 * Build the community feed: merges social posts with active blood requests,
 * ranks them with the algorithm above, and returns a windowed slice.
 * Everyone (public + registered) can read the feed.
 */
export function getSocialFeed(opts: FeedFilter = {}) {
  const {
    viewerId = null,
    isAdmin = false,
    limit = 30,
    offset = 0,
    filter = "all",
  } = opts;
  const db = getDb();

  // Posts (active only).
  const postRows = db
    .prepare(
      `
      SELECT p.*,
        pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM social_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS my_like,
        (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count,
        (SELECT COUNT(*) FROM social_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) AS my_save
      FROM social_posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
    `,
    )
    .all(viewerId ?? -1, viewerId ?? -1) as any[];

  let posts = postRows
    .map((r) => mapSocialPostRow(r, viewerId))
    // Private posts are only visible to their author (and admins).
    .filter(
      (p) => p.isPublic || viewerId === p.authorId || isAdmin === true,
    );

  // Active blood requests.
  const requestRows = getActiveBloodRequests(300).filter(
    (r) => !r.archived_at,
  );
  const requestItems = requestRows.map((r: any) => ({
    kind: "request" as const,
    id: `req-${r.id}`,
    requestId: r.id,
    authorName: r.patient_name,
    authorRole: "patient",
    bloodGroup: r.blood_group,
    units: r.units_needed,
    urgency: r.urgency_level,
    district: r.district,
    upazila: r.upazila,
    neededDate: r.needed_date,
    neededTime: r.needed_time,
    whenNeeded: r.when_needed,
    hospitalName: r.hospital_name,
    contactNumber: r.contact_number,
    reason: r.reason,
    status: r.status,
    isLastChance: r.is_last_chance,
    createdAt: r.created_at,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    pinned: false,
  }));

  // Apply tab filters.
  let merged: any[] = [];
  if (filter === "requests") {
    merged = requestItems;
  } else if (filter === "announcements") {
    merged = posts.filter((p) => p.postType === "admin_announcement");
  } else if (filter === "updates") {
    merged = posts.filter(
      (p) =>
        p.postType === "general" || p.postType === "donation_update",
    );
  } else {
    merged = [...posts, ...requestItems];
  }

  // Score + sort: pinned first (by recency), then by algorithm score.
  for (const item of merged) item._score = item.pinned ? Infinity : scoreFeedItem(item);
  merged.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return b._score - a._score;
  });

  const total = merged.length;
  const items = merged.slice(offset, offset + limit);
  return { items, total, hasMore: offset + limit < total };
}

export function getSocialPostById(id: number) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT p.*,
        pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count
      FROM social_posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE p.id = ?
    `,
    )
    .get(id) as any;
  return row ? mapSocialPostRow(row, null) : null;
}

/** Full single post (with viewer like/save state) for the deep-link page. */
export function getSocialPostFull(id: number, viewerId: number | null) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT p.*,
        pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM social_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS my_like,
        (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count,
        (SELECT COUNT(*) FROM social_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) AS my_save
      FROM social_posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE p.id = ?
    `,
    )
    .get(viewerId ?? -1, viewerId ?? -1, id) as any;
  return row ? mapSocialPostRow(row, viewerId) : null;
}

/** All active posts by a user (for the profile "My Posts" tab). */
export function getMyPosts(authorId: number, viewerId: number | null) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT p.*,
        pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM social_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS my_like,
        (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count,
        (SELECT COUNT(*) FROM social_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) AS my_save
      FROM social_posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE p.author_id = ? AND p.status = 'active'
      ORDER BY p.created_at DESC
    `,
    )
    .all(viewerId ?? -1, viewerId ?? -1, authorId) as any[];
  return rows.map((r) => mapSocialPostRow(r, viewerId));
}

/** Posts saved by a user (for the profile "Saved" tab). */
export function getSavedPosts(userId: number) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT p.*,
        pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM social_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS my_like,
        (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count,
        (SELECT COUNT(*) FROM social_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) AS my_save
      FROM social_post_saves sv
      JOIN social_posts p ON p.id = sv.post_id
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE sv.user_id = ? AND p.status = 'active'
      ORDER BY sv.created_at DESC
    `,
    )
    .all(userId, userId, userId) as any[];
  return rows.map((r) => mapSocialPostRow(r, userId));
}

// ── Notifications (in-app) ───────────────────────────────────────────

export function createNotification(input: {
  userId: number;
  actorId: number | null;
  type: string;
  postId?: number | null;
  content?: string | null;
}) {
  if (input.userId === input.actorId) return 0;
  const db = getDb();
  const { changes } = db
    .prepare(
      `INSERT INTO notifications (user_id, actor_id, type, post_id, content) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.userId, input.actorId, input.type, input.postId ?? null, input.content ?? null);
  return changes || 0;
}

export function getMyNotifications(userId: number, limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT n.*, pa.full_name_en AS actor_name, pa.avatar_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN profiles pa ON pa.id = n.actor_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as any[];
}

export function markNotificationRead(id: number, userId: number) {
  const db = getDb();
  const { changes } = db
    .prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  return changes || 0;
}

export function markAllNotificationsRead(userId: number) {
  const db = getDb();
  const { changes } = db
    .prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`)
    .run(userId);
  return changes || 0;
}

export function updateSocialPost(
  id: number,
  data: { content?: string; images?: string[]; isPublic?: boolean },
) {
  const db = getDb();
  const fields: string[] = [];
  const params: any = { id };
  if (data.content !== undefined) {
    fields.push("content = @content");
    params.content = data.content;
  }
  if (data.images !== undefined) {
    fields.push("images = @images");
    params.images =
      data.images && data.images.length
        ? JSON.stringify(data.images)
        : null;
  }
  if (data.isPublic !== undefined) {
    fields.push("is_public = @isPublic");
    params.isPublic = data.isPublic ? 1 : 0;
  }
  if (!fields.length) return 0;
  fields.push("updated_at = datetime('now')");
  return db
    .prepare(`UPDATE social_posts SET ${fields.join(", ")} WHERE id = @id`)
    .run(params).changes;
}

export function deleteSocialPost(id: number) {
  const db = getDb();
  // Soft-delete so we keep referential integrity / audit trail.
  return db
    .prepare(
      "UPDATE social_posts SET status = 'deleted', content = '', images = NULL WHERE id = ?",
    )
    .run(id).changes;
}

export function toggleSocialPostLike(postId: number, userId: number) {
  const db = getDb();
  const existing = db
    .prepare(
      "SELECT id FROM social_post_likes WHERE post_id = ? AND user_id = ?",
    )
    .get(postId, userId);
  let liked: boolean;
  if (existing) {
    db.prepare(
      "DELETE FROM social_post_likes WHERE post_id = ? AND user_id = ?",
    ).run(postId, userId);
    liked = false;
  } else {
    db.prepare(
      "INSERT INTO social_post_likes (post_id, user_id) VALUES (?, ?)",
    ).run(postId, userId);
    liked = true;
  }
  const likeCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM social_post_likes WHERE post_id = ?")
      .get(postId) as any
  ).c;
  return { liked, likeCount };
}

export function addSocialPostComment(
  postId: number,
  authorId: number,
  authorRole: string,
  authorName: string,
  content: string,
) {
  const db = getDb();
  return db
    .prepare(
      `INSERT INTO social_post_comments (post_id, author_id, author_role, author_name, content)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(postId, authorId, authorRole, authorName, content)
    .lastInsertRowid as number;
}

export function getSocialPostComments(postId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM social_post_comments WHERE post_id = ? ORDER BY created_at ASC`,
    )
    .all(postId);
}

export function incrementSocialPostShare(postId: number, userId: number) {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO social_post_shares (post_id, user_id) VALUES (?, ?)",
  ).run(postId, userId);
  return db
    .prepare(
      "UPDATE social_posts SET share_count = (SELECT COUNT(*) FROM social_post_shares WHERE post_id = ?) WHERE id = ?",
    )
    .run(postId, postId).changes;
}

export function pinSocialPost(id: number, pinned: boolean) {
  const db = getDb();
  return db
    .prepare("UPDATE social_posts SET pinned = ? WHERE id = ?")
    .run(pinned ? 1 : 0, id).changes;
}

/** Admin: paginated list of ALL posts (incl. deleted) for moderation. */
export function adminGetSocialPosts(opts: {
  filter?: "all" | "pinned" | "deleted";
  page?: number;
  pageSize?: number;
} = {}) {
  const { filter = "all", page = 1, pageSize = 20 } = opts;
  const db = getDb();
  let where = "1=1";
  if (filter === "pinned") where = "p.pinned = 1";
  else if (filter === "deleted") where = "p.status = 'deleted'";
  const rows = db
    .prepare(
      `
      SELECT p.*, pr.full_name_en AS author_name,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count
      FROM social_posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
    )
    .all(pageSize, (page - 1) * pageSize) as any[];
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM social_posts p WHERE ${where}`).get() as any
  ).c;
  return {
    items: rows.map((r) => mapSocialPostRow(r, null)),
    total,
    hasMore: page * pageSize < total,
  };
}

// ── Stories (Instagram-style, auto-expire after 24h) ──────────────────

export function createStory(input: {
  authorId: number;
  imageUrl?: string | null;
  content?: string | null;
}): number {
  const db = getDb();
  return db
    .prepare(
      `INSERT INTO stories (author_id, image_url, content, created_at, expires_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now', '+24 hours'))`,
    )
    .run(input.authorId, input.imageUrl ?? null, input.content ?? null)
    .lastInsertRowid as number;
}

export function getStories() {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*, pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url
         FROM stories s LEFT JOIN profiles pr ON pr.id = s.author_id
        WHERE s.expires_at > datetime('now') ORDER BY s.created_at DESC LIMIT 200`,
    )
    .all();
}

export function deleteStory(id: number, authorId: number): number {
  const db = getDb();
  return db
    .prepare("DELETE FROM stories WHERE id = ? AND author_id = ?")
    .run(id, authorId).changes;
}

// ── Post saves / bookmarks ────────────────────────────────────────────

export function toggleSocialPostSave(postId: number, userId: number) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM social_post_saves WHERE post_id = ? AND user_id = ?")
    .get(postId, userId);
  let saved: boolean;
  if (existing) {
    db.prepare("DELETE FROM social_post_saves WHERE post_id = ? AND user_id = ?").run(postId, userId);
    saved = false;
  } else {
    db.prepare("INSERT INTO social_post_saves (post_id, user_id) VALUES (?, ?)").run(postId, userId);
    saved = true;
  }
  const saveCount = (
    db.prepare("SELECT COUNT(*) AS c FROM social_post_saves WHERE post_id = ?").get(postId) as any
  ).c;
  return { saved, saveCount };
}

// ── Web Push subscriptions ────────────────────────────────────────────

export function addPushSubscription(input: {
  userId?: number | null;
  endpoint: string;
  p256dh: string;
  auth: string;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth_key = excluded.auth_key`,
  ).run(input.userId ?? null, input.endpoint, input.p256dh, input.auth);
}

export function deletePushSubscription(endpoint: string): void {
  const db = getDb();
  db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export function getAllPushSubscriptions() {
  const db = getDb();
  const rows = db.prepare("SELECT endpoint, p256dh, auth_key FROM push_subscriptions").all() as any[];
  return rows.map((r) => ({
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth_key },
  }));
}

// ── Post views + story viewers ────────────────────────────────────────

export function incrementPostView(postId: number): void {
  const db = getDb();
  db.prepare("UPDATE social_posts SET view_count = view_count + 1 WHERE id = ?").run(postId);
}

export function recordStoryView(storyId: number, viewerId: number): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)`,
  ).run(storyId, viewerId);
}

export function getStoryViewers(storyId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT sv.viewed_at, pr.full_name_en AS name, pr.avatar_url AS avatar_url
         FROM story_views sv LEFT JOIN profiles pr ON pr.id = sv.viewer_id
        WHERE sv.story_id = ? ORDER BY sv.viewed_at DESC`,
    )
    .all(storyId);
}

// Password reset queries
export function createPasswordReset(identifier: string, token: string, expiresAt: string) {
  const db = getDb();
  db.prepare(
    "DELETE FROM password_resets WHERE identifier = ?",
  ).run(identifier);
  return db
    .prepare(
      `INSERT INTO password_resets (identifier, token, expires_at) VALUES (?, ?, ?)`,
    )
    .run(identifier, token, expiresAt).lastInsertRowid as number;
}

export function getPasswordResetByToken(token: string) {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM password_resets WHERE token = ? AND used = 0",
    )
    .get(token) as
    | {
        id: number;
        identifier: string;
        token: string;
        expires_at: string;
        used: number;
        created_at: string;
      }
    | undefined;
}

export function markPasswordResetUsed(id: number) {
  const db = getDb();
  return db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(id)
    .changes;
}

export function updateUserPassword(
  identifier: string,
  passwordHash: string,
) {
  const db = getDb();
  // identifier can be email or phone; update by matching either column.
  return db
    .prepare(
      "UPDATE profiles SET password_hash = ?, updated_at = datetime('now') WHERE email = ? OR phone = ?",
    )
    .run(passwordHash, identifier, identifier).changes;
}

// Stats
export function getDashboardStats() {
  const db = getDb();
  const totalUsers = db
    .prepare("SELECT COUNT(*) as count FROM profiles")
    .get() as { count: number };
  const totalRequests = db
    .prepare("SELECT COUNT(*) as count FROM blood_requests")
    .get() as { count: number };
  const activeRequests = db
    .prepare(
      "SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active'",
    )
    .get() as { count: number };
  const hospitals = db
    .prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'hospital'")
    .get() as { count: number };
  const totalDonations = db
    .prepare("SELECT COUNT(*) as count FROM donations")
    .get() as { count: number };

  return {
    totalUsers: totalUsers?.count || 0,
    totalRequests: totalRequests?.count || 0,
    activeRequests: activeRequests?.count || 0,
    totalHospitals: hospitals?.count || 0,
    totalDonations: totalDonations?.count || 0,
  };
}

export function getAnalyticsStats() {
  const db = getDb();
  const totalUsers =
    (
      db.prepare("SELECT COUNT(*) as count FROM profiles").get() as {
        count: number;
      }
    ).count || 0;
  const totalDonors =
    (
      db
        .prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'donor'")
        .get() as { count: number }
    ).count || 0;
  const totalPatients =
    (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM profiles WHERE role = 'patient'",
        )
        .get() as { count: number }
    ).count || 0;
  const totalHospitals =
    (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM profiles WHERE role = 'hospital'",
        )
        .get() as { count: number }
    ).count || 0;
  const totalRequests =
    (
      db.prepare("SELECT COUNT(*) as count FROM blood_requests").get() as {
        count: number;
      }
    ).count || 0;
  const activeRequests =
    (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active' AND archived_at IS NULL",
        )
        .get() as { count: number }
    ).count || 0;
  const fulfilledRequests =
    (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM blood_requests WHERE status = 'fulfilled'",
        )
        .get() as { count: number }
    ).count || 0;

  const bloodGroups = db
    .prepare(
      "SELECT blood_group, COUNT(*) as count FROM profiles WHERE blood_group IS NOT NULL GROUP BY blood_group",
    )
    .all() as { blood_group: string; count: number }[];
  const urgencyLevels = db
    .prepare(
      "SELECT urgency_level, COUNT(*) as count FROM blood_requests GROUP BY urgency_level",
    )
    .all() as { urgency_level: string; count: number }[];
  const recentActivity = db
    .prepare("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 10")
    .all();

  return {
    totalUsers,
    totalDonors,
    totalPatients,
    totalHospitals,
    totalRequests,
    activeRequests,
    fulfilledRequests,
    donationsThisMonth:
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM donations WHERE donation_date >= datetime('now', '-30 days')",
          )
          .get() as { count: number }
      ).count || 0,
    totalDonations:
      (
        db.prepare("SELECT COUNT(*) as count FROM donations").get() as {
          count: number;
        }
      ).count || 0,
    bloodGroups,
    urgencyLevels,
    recentActivity,
  };
}

export function getBloodInventory() {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT blood_group, COUNT(*) as count
    FROM profiles
    WHERE role = 'donor' 
      AND is_active = 1 
      AND blood_group IS NOT NULL
      AND (
        last_donation_date IS NULL 
        OR (
          CASE COALESCE(last_donation_type, 'whole_blood')
            WHEN 'platelets' THEN julianday('now') - julianday(last_donation_date) >= 14
            WHEN 'plasma' THEN julianday('now') - julianday(last_donation_date) >= 30
            ELSE julianday('now') - julianday(last_donation_date) >= 90
          END
        )
      )
    GROUP BY blood_group
    ORDER BY blood_group
  `,
    )
    .all() as { blood_group: string; count: number }[];
}

/**
 * Eligible-donor counts grouped by district + blood group.
 *
 * Counts only — never names or phone numbers. The eligibility predicate
 * mirrors findMatchingDonors so these numbers agree with what a donor
 * search actually returns.
 */
export function getEligibleDonorMatrix() {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT district, blood_group, COUNT(*) as count
    FROM profiles
    WHERE role = 'donor'
      AND is_active = 1
      AND is_approved = 1
      AND district IS NOT NULL AND district != ''
      AND blood_group IS NOT NULL AND blood_group != ''
      AND NOT (
        (sex = 'female' AND hb_level IS NOT NULL AND hb_level < 12.5)
        OR (sex != 'female' AND hb_level IS NOT NULL AND hb_level < 13.0)
      )
    GROUP BY district, blood_group
    ORDER BY district, blood_group
  `,
    )
    .all() as { district: string; blood_group: string; count: number }[];
}

export function getDistrictStats() {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT 
      COALESCE(district, 'Unknown') as district,
      COUNT(*) as donors,
      SUM(CASE WHEN role = 'donor' THEN 1 ELSE 0 END) as donor_count,
      SUM(CASE WHEN role = 'hospital' THEN 1 ELSE 0 END) as hospital_count,
      SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) as patient_count
    FROM profiles
    WHERE district IS NOT NULL
    GROUP BY district
    ORDER BY donors DESC
  `,
    )
    .all() as {
    district: string;
    donors: number;
    donor_count: number;
    hospital_count: number;
    patient_count: number;
  }[];
}

export function getDonorsWithStats() {
  const db = getDb();
  const donors = db
    .prepare(
      `
    WITH per_type AS (
      SELECT
        donor_id,
        MAX(CASE WHEN donation_type = 'whole_blood' OR donation_type IS NULL THEN donation_date END) as last_wb,
        MAX(CASE WHEN donation_type = 'platelets' THEN donation_date END) as last_pl,
        MAX(CASE WHEN donation_type = 'plasma' THEN donation_date END) as last_pm
      FROM donations GROUP BY donor_id
    ),
    donor_stats AS (
      SELECT donor_id, COUNT(*) as donation_count, SUM(units) as unit_count, MAX(donation_date) as last_donation
      FROM donations GROUP BY donor_id
    ),
    ref_stats AS (
      SELECT referrer_profile_id, COUNT(*) as referral_count
      FROM donations WHERE referrer_profile_id IS NOT NULL
      GROUP BY referrer_profile_id
    ),
    base AS (
      SELECT p.*,
        COALESCE(ds.donation_count, 0) as total_donations,
        COALESCE(ds.unit_count, 0) as total_units,
        ds.last_donation as donation_last_date,
        COALESCE(p.last_donation_type, 'whole_blood') as donation_type,
        p.hb_level,
        p.last_hb_test_date,
        COALESCE(pt.last_wb, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND COALESCE(p.last_donation_type,'whole_blood') = 'whole_blood' THEN p.last_donation_date END) as eff_last_wb,
        COALESCE(pt.last_pl, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'platelets' THEN p.last_donation_date END) as eff_last_pl,
        COALESCE(pt.last_pm, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'plasma' THEN p.last_donation_date END) as eff_last_pm,
        COALESCE(r.referral_count, 0) as referral_count
      FROM profiles p
      LEFT JOIN per_type pt ON p.id = pt.donor_id
      LEFT JOIN donor_stats ds ON p.id = ds.donor_id
      LEFT JOIN ref_stats r ON p.id = r.referrer_profile_id
      WHERE p.role = 'donor' AND p.is_active = 1 AND p.is_approved = 1
        AND p.blood_group IS NOT NULL
        AND p.full_name_en IS NOT NULL AND p.full_name_en != ''
        AND p.phone IS NOT NULL AND p.phone != ''
        AND NOT (
          (p.sex = 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 12.5)
          OR (p.sex != 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 13.0)
        )
    ),
    elig AS (
      SELECT *,
        CASE WHEN eff_last_wb IS NULL OR julianday('now') - julianday(eff_last_wb) >= 90 THEN 1 ELSE 0 END as eligible_whole_blood,
        CASE WHEN eff_last_pl IS NULL OR julianday('now') - julianday(eff_last_pl) >= 14 THEN 1 ELSE 0 END as eligible_platelets,
        CASE WHEN eff_last_pm IS NULL OR julianday('now') - julianday(eff_last_pm) >= 30 THEN 1 ELSE 0 END as eligible_plasma
      FROM base
    )
    SELECT *,
      CASE
        WHEN hb_level IS NULL THEN 'not_tested'
        WHEN (sex = 'female' AND hb_level < 12.5)
          OR (sex != 'female' AND hb_level < 13.0) THEN 'low_hb'
        ELSE 'eligible'
      END as hb_status,
      (eligible_whole_blood + eligible_platelets + eligible_plasma) as eligible_types_count,
      CASE WHEN (eligible_whole_blood + eligible_platelets + eligible_plasma) > 0 THEN 1 ELSE 0 END as is_eligible,
      CASE
        WHEN (eligible_whole_blood + eligible_platelets + eligible_plasma) = 0 THEN
          MIN(
            CASE WHEN eff_last_wb IS NOT NULL THEN date(eff_last_wb, '+90 day') END,
            CASE WHEN eff_last_pl IS NOT NULL THEN date(eff_last_pl, '+14 day') END,
            CASE WHEN eff_last_pm IS NOT NULL THEN date(eff_last_pm, '+30 day') END
          )
        ELSE NULL
      END as next_eligible_date
    FROM elig
    ORDER BY eligible_types_count DESC, total_donations DESC
  `,
    )
    .all() as any[];

  return donors.map((d: any) => {
    const coords = resolveCoords(null, null, d.district, d.upazila, d.union_name);
    return {
      ...d,
      is_active: d.is_active === 1,
      is_eligible: d.is_eligible === 1,
      eligible_whole_blood: d.eligible_whole_blood === 1,
      eligible_platelets: d.eligible_platelets === 1,
      eligible_plasma: d.eligible_plasma === 1,
      eligible_types_count: d.eligible_types_count || 0,
      total_referrals: d.referral_count || 0,
      badges: computeBadges(d.total_donations || 0, d.referral_count || 0),
      lat: coords.lat,
      lng: coords.lng,
    };
  });
}

export function getMonthlyStats() {
  const db = getDb();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentYear = new Date().getFullYear();

  return months.map((month, index) => {
    const monthStr = String(index + 1).padStart(2, "0");
    const startDate = `${currentYear}-${monthStr}-01`;
    const nextMonth = index < 11
      ? `${currentYear}-${String(index + 2).padStart(2, "0")}-01`
      : `${currentYear + 1}-01-01`;

    const requests =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM blood_requests WHERE created_at >= ? AND created_at < ?",
          )
          .get(startDate, nextMonth) as { count: number }
      )?.count || 0;
    const donors =
      (
        db
          .prepare(
            "SELECT COUNT(DISTINCT donor_id) as count FROM donations WHERE donation_date >= ? AND donation_date < ?",
          )
          .get(startDate, nextMonth) as { count: number }
      )?.count || 0;
    const donations =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM donations WHERE donation_date >= ? AND donation_date < ?",
          )
          .get(startDate, nextMonth) as { count: number }
      )?.count || 0;
    const units =
      (
        db
          .prepare(
            "SELECT COALESCE(SUM(units), 0) as count FROM donations WHERE donation_date >= ? AND donation_date < ?",
          )
          .get(startDate, nextMonth) as { count: number }
      )?.count || 0;
    const newUsers =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM profiles WHERE created_at >= ? AND created_at < ?",
          )
          .get(startDate, nextMonth) as { count: number }
      )?.count || 0;

    return { month, requests, donors, donations, units, newUsers };
  });
}

/**
 * Daily stats for the last N days — donations, new donors, new users, new requests.
 * Efficient: uses indexed date-range queries, one per metric per day.
 */
export function getDailyStats(days: number = 30) {
  const db = getDb();
  const result: {
    date: string;
    donations: number;
    units: number;
    newDonors: number;
    newUsers: number;
    newRequests: number;
  }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const dayStart = day.toISOString().slice(0, 10);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEnd = nextDay.toISOString().slice(0, 10);

    const donations =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM donations WHERE donation_date >= ? AND donation_date < ?",
          )
          .get(dayStart, dayEnd) as { count: number }
      )?.count || 0;
    const units =
      (
        db
          .prepare(
            "SELECT COALESCE(SUM(units), 0) as count FROM donations WHERE donation_date >= ? AND donation_date < ?",
          )
          .get(dayStart, dayEnd) as { count: number }
      )?.count || 0;
    const newDonors =
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM donations d1
             WHERE d1.donation_date >= ? AND d1.donation_date < ?
               AND NOT EXISTS (SELECT 1 FROM donations d2 WHERE d2.donor_id = d1.donor_id AND d2.donation_date < ?)`,
          )
          .get(dayStart, dayEnd, dayStart) as { count: number }
      )?.count || 0;
    const newUsers =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM profiles WHERE created_at >= ? AND created_at < ?",
          )
          .get(dayStart, dayEnd) as { count: number }
      )?.count || 0;
    const newRequests =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM blood_requests WHERE created_at >= ? AND created_at < ?",
          )
          .get(dayStart, dayEnd) as { count: number }
      )?.count || 0;

    result.push({
      date: dayStart,
      donations,
      units,
      newDonors,
      newUsers,
      newRequests,
    });
  }

  return result;
}

/**
 * Weekly stats for the last N weeks — same metrics as daily, grouped by week.
 */
export function getWeeklyStats(weeks: number = 12) {
  const db = getDb();
  const result: {
    weekStart: string;
    weekLabel: string;
    donations: number;
    units: number;
    newDonors: number;
    newUsers: number;
    newRequests: number;
  }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - dayOfWeek - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);

    const donations =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM donations WHERE donation_date >= ? AND donation_date < ?",
          )
          .get(startStr, endStr) as { count: number }
      )?.count || 0;
    const units =
      (
        db
          .prepare(
            "SELECT COALESCE(SUM(units), 0) as count FROM donations WHERE donation_date >= ? AND donation_date < ?",
          )
          .get(startStr, endStr) as { count: number }
      )?.count || 0;
    const newDonors =
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM donations d1
             WHERE d1.donation_date >= ? AND d1.donation_date < ?
               AND NOT EXISTS (SELECT 1 FROM donations d2 WHERE d2.donor_id = d1.donor_id AND d2.donation_date < ?)`,
          )
          .get(startStr, endStr, startStr) as { count: number }
      )?.count || 0;
    const newUsers =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM profiles WHERE created_at >= ? AND created_at < ?",
          )
          .get(startStr, endStr) as { count: number }
      )?.count || 0;
    const newRequests =
      (
        db
          .prepare(
            "SELECT COUNT(*) as count FROM blood_requests WHERE created_at >= ? AND created_at < ?",
          )
          .get(startStr, endStr) as { count: number }
      )?.count || 0;

    const label = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    result.push({
      weekStart: startStr,
      weekLabel: label,
      donations,
      units,
      newDonors,
      newUsers,
      newRequests,
    });
  }

  return result;
}

function computeBadges(count: number, referrals: number = 0): string[] {
  const badges: string[] = [];
  if (count >= 1) badges.push("First Drop");
  if (count >= 3) badges.push("Regular Donor");
  if (count >= 5) badges.push("Silver");
  if (count >= 10) badges.push("Gold");
  if (count >= 25) badges.push("Platinum");
  if (!count || count === 0) badges.push("Newbie");
  // Referrer badges — people who connect donors to patients.
  if (referrals >= 10) badges.push("Super Connector");
  else if (referrals >= 3) badges.push("Connector");
  return badges;
}

// ── Phase 5.1: Public Transparency Dashboard ──────────────────────────

export function getPublicTransparencyStats() {
  const db = getDb();
  const totalDonations =
    (db.prepare("SELECT COUNT(*) as count FROM donations").get() as { count: number }).count || 0;
  const totalUnits =
    (db.prepare("SELECT COALESCE(SUM(units), 0) as sum FROM donations").get() as { sum: number }).sum || 0;
  const totalDonors =
    (db.prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'donor' AND is_active = 1").get() as { count: number }).count || 0;
  const totalRequests =
    (db.prepare("SELECT COUNT(*) as count FROM blood_requests").get() as { count: number }).count || 0;
  const fulfilledRequests =
    (db.prepare("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'fulfilled'").get() as { count: number }).count || 0;
  const activeRequests =
    (db.prepare("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active'").get() as { count: number }).count || 0;
  const totalHospitals =
    (db.prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'hospital' AND is_active = 1").get() as { count: number }).count || 0;
  const districtsCovered =
    (db.prepare("SELECT COUNT(DISTINCT district) as count FROM profiles WHERE district IS NOT NULL AND district != ''").get() as { count: number }).count || 0;

  // Estimate lives saved: each unit potentially saves 1 life
  const livesSaved = totalUnits;

  // Donations this month
  const donationsThisMonth =
    (db.prepare("SELECT COUNT(*) as count FROM donations WHERE donation_date >= datetime('now', '-30 days')").get() as { count: number }).count || 0;

  // Donations this year
  const currentYear = new Date().getFullYear();
  const donationsThisYear =
    (db.prepare("SELECT COUNT(*) as count FROM donations WHERE donation_date >= ?").get(`${currentYear}-01-01`) as { count: number }).count || 0;

  // Fulfillment rate
  const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0;

  // Blood group distribution of donors
  const bloodGroupDistribution = db
    .prepare("SELECT blood_group, COUNT(*) as count FROM profiles WHERE role = 'donor' AND is_active = 1 AND blood_group IS NOT NULL GROUP BY blood_group ORDER BY count DESC")
    .all() as { blood_group: string; count: number }[];

  // Monthly donation trends (last 12 months)
  const monthlyTrends = db
    .prepare(`
      SELECT
        strftime('%Y-%m', donation_date) as month,
        COUNT(*) as donations,
        COALESCE(SUM(units), 0) as units
      FROM donations
      WHERE donation_date >= datetime('now', '-12 months')
      GROUP BY strftime('%Y-%m', donation_date)
      ORDER BY month ASC
    `)
    .all() as { month: string; donations: number; units: number }[];

  // District-wise donor count
  const districtDonors = db
    .prepare(`
      SELECT COALESCE(district, 'Unknown') as district, COUNT(*) as count
      FROM profiles WHERE role = 'donor' AND is_active = 1 AND district IS NOT NULL
      GROUP BY district ORDER BY count DESC
    `)
    .all() as { district: string; count: number }[];

  return {
    totalDonations,
    totalUnits,
    totalDonors,
    totalRequests,
    fulfilledRequests,
    activeRequests,
    totalHospitals,
    districtsCovered,
    livesSaved,
    donationsThisMonth,
    donationsThisYear,
    fulfillmentRate,
    bloodGroupDistribution,
    monthlyTrends,
    districtDonors,
  };
}

// ── Phase 5.2: Donor Leaderboard & Gamification ───────────────────────

export function getTopDonors(limit: number = 20) {
  const db = getDb();
  const donors = db
    .prepare(`
      SELECT
        p.id,
        p.full_name_en,
        p.full_name_bn,
        p.blood_group,
        p.district,
        p.upazila,
        p.show_on_leaderboard,
        COALESCE(d.donation_count, 0) as total_donations,
        COALESCE(d.unit_count, 0) as total_units,
        d.last_donation as last_donation_date
      FROM profiles p
      LEFT JOIN (
        SELECT donor_id, COUNT(*) as donation_count, SUM(units) as unit_count, MAX(donation_date) as last_donation
        FROM donations GROUP BY donor_id
      ) d ON p.id = d.donor_id
      WHERE p.role = 'donor'
        AND p.is_active = 1
        AND p.show_on_leaderboard = 1
        AND COALESCE(d.donation_count, 0) > 0
      ORDER BY total_donations DESC, total_units DESC
      LIMIT ?
    `)
    .all(limit) as any[];

  return donors.map((d: any) => ({
    ...d,
    badges: computeBadges(d.total_donations || 0),
  }));
}

/**
 * Top referrers — people whose help finding a donor led to a recorded
 * donation. Registered referrers are grouped by profile; free-text
 * referrers by phone (falling back to name).
 */
export function getTopReferrers(limit: number = 20) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        d.referrer_profile_id,
        COALESCE(p.full_name_en, d.referrer_name) AS referrer_name,
        COALESCE(p.full_name_bn, d.referrer_name) AS referrer_name_bn,
        COALESCE(p.phone, d.referrer_phone) AS referrer_phone,
        p.blood_group,
        p.district,
        p.upazila,
        COUNT(*) AS total_referrals,
        MAX(d.donation_date) AS last_referral_date
      FROM donations d
      LEFT JOIN profiles p ON d.referrer_profile_id = p.id
      WHERE d.referrer_profile_id IS NOT NULL
         OR (d.referrer_name IS NOT NULL AND d.referrer_name != '')
      GROUP BY COALESCE(
        CAST(d.referrer_profile_id AS TEXT),
        'phone:' || d.referrer_phone,
        'name:' || d.referrer_name
      )
      ORDER BY total_referrals DESC, last_referral_date DESC
      LIMIT ?
      `,
    )
    .all(limit);
}

/**
 * Lightweight, public-safe referrer search — returns only display fields
 * (never password hashes or private data) for the referral picker.
 */
export function searchReferrerCandidates(search: string, limit: number = 8) {
  const db = getDb();
  const term = `%${search}%`;
  return db
    .prepare(
      `SELECT id, full_name_en, full_name_bn, phone
       FROM profiles
       WHERE is_active = 1
         AND (full_name_en LIKE ? OR full_name_bn LIKE ? OR phone LIKE ?)
       ORDER BY full_name_en ASC
       LIMIT ?`,
    )
    .all(term, term, term, limit);
}

export function getDonorOfTheMonth() {
  const db = getDb();
  // Get the donor with the most donations in the current month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const result = db
    .prepare(`
      SELECT
        p.id,
        p.full_name_en,
        p.full_name_bn,
        p.blood_group,
        p.district,
        p.upazila,
        p.show_on_leaderboard,
        COUNT(d.id) as monthly_donations,
        COALESCE(SUM(d.units), 0) as monthly_units,
        (
          SELECT COUNT(*) FROM donations WHERE donor_id = p.id
        ) as total_donations
      FROM profiles p
      JOIN donations d ON p.id = d.donor_id
      WHERE p.role = 'donor'
        AND p.is_active = 1
        AND p.show_on_leaderboard = 1
        AND strftime('%Y-%m', d.donation_date) = ?
      GROUP BY p.id
      ORDER BY monthly_donations DESC, monthly_units DESC
      LIMIT 1
    `)
    .get(currentMonth) as any;

  if (!result) return null;

  return {
    ...result,
    badges: computeBadges(result.total_donations || 0),
  };
}

export function getDonationImpactStats() {
  const db = getDb();
  const totalUnits =
    (db.prepare("SELECT COALESCE(SUM(units), 0) as sum FROM donations").get() as { sum: number }).sum || 0;

  // Each donation potentially impacts up to 3 lives (patient + family + community)
  const livesImpacted = totalUnits * 3;

  // Districts with active donors
  const activeDistricts =
    (db.prepare("SELECT COUNT(DISTINCT district) as count FROM profiles WHERE role = 'donor' AND is_active = 1 AND district IS NOT NULL").get() as { count: number }).count || 0;

  // Average donations per donor
  const totalDonors =
    (db.prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'donor'").get() as { count: number }).count || 0;
  const totalDonations =
    (db.prepare("SELECT COUNT(*) as count FROM donations").get() as { count: number }).count || 0;
  const avgDonationsPerDonor = totalDonors > 0 ? Math.round((totalDonations / totalDonors) * 10) / 10 : 0;

  return {
    totalUnits,
    livesImpacted,
    activeDistricts,
    avgDonationsPerDonor,
  };
}

// ── Phase 5.3: Organizations ──────────────────────────────────────────

export function getOrganizations() {
  const db = getDb();
  return db
    .prepare("SELECT * FROM organizations WHERE is_active = 1 ORDER BY created_at ASC")
    .all();
}

export function getAllOrganizations() {
  const db = getDb();
  return db
    .prepare("SELECT * FROM organizations ORDER BY created_at DESC")
    .all();
}

export function createOrganization(data: {
  name_en: string;
  name_bn?: string;
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  district?: string;
  is_active?: number;
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO organizations (name_en, name_bn, description, contact_phone, contact_email, district, is_active)
    VALUES (@name_en, @name_bn, @description, @contact_phone, @contact_email, @district, @is_active)
  `);
  return stmt.run({
    name_en: data.name_en,
    name_bn: data.name_bn ?? null,
    description: data.description ?? null,
    contact_phone: data.contact_phone ?? null,
    contact_email: data.contact_email ?? null,
    district: data.district ?? null,
    is_active: data.is_active ?? 1,
  }).lastInsertRowid as number;
}

export function updateOrganization(id: number, data: Record<string, any>) {
  const db = getDb();
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(", ");
  const stmt = db.prepare(
    `UPDATE organizations SET ${fields} WHERE id = @id`,
  );
  return stmt.run({ ...data, id }).changes;
}

export function deleteOrganization(id: number) {
  const db = getDb();
  // Soft delete — preserve referential integrity for existing profiles/requests.
  return db
    .prepare("UPDATE organizations SET is_active = 0 WHERE id = ?")
    .run(id).changes;
}

// ── Donations CRUD ────────────────────────────────────────────────────

export function updateDonation(id: number, data: Record<string, any>) {
  const db = getDb();
  const allowed = [
    "donor_id",
    "request_id",
    "blood_group",
    "units",
    "hospital_name",
    "donation_date",
    "donation_type",
    "recipient_type",
    "notes",
    "referrer_profile_id",
    "referrer_name",
    "referrer_phone",
  ];
  const updates = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return 0;
  const setClause = updates.map(([k]) => `${k} = @${k}`).join(", ");
  const stmt = db.prepare(
    `UPDATE donations SET ${setClause} WHERE id = @id`,
  );
  return stmt.run({ ...Object.fromEntries(updates), id }).changes;
}

export function deleteDonation(id: number) {
  const db = getDb();
  return db.prepare("DELETE FROM donations WHERE id = ?").run(id).changes;
}

// ── Donor Matches (admin overview) ────────────────────────────────────

export function getAllDonorMatches(filters?: {
  limit?: number;
  offset?: number;
  status?: string;
  requestId?: number;
  donorId?: number;
}) {
  const db = getDb();
  let sql = `
    SELECT
      dm.id,
      dm.request_id,
      dm.donor_id,
      dm.match_rank,
      dm.match_score,
      dm.notification_method,
      dm.response_status,
      dm.responded_at,
      dm.created_at,
      br.patient_name,
      br.blood_group,
      br.urgency_level,
      br.district,
      br.status AS request_status,
      p.full_name_en AS donor_name,
      p.full_name_bn AS donor_name_bn,
      p.phone AS donor_phone
    FROM donor_matches dm
    LEFT JOIN blood_requests br ON dm.request_id = br.id
    LEFT JOIN profiles p ON dm.donor_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (filters?.status && filters.status !== "all") {
    sql += " AND dm.response_status = ?";
    params.push(filters.status);
  }
  if (filters?.requestId) {
    sql += " AND dm.request_id = ?";
    params.push(filters.requestId);
  }
  if (filters?.donorId) {
    sql += " AND dm.donor_id = ?";
    params.push(filters.donorId);
  }
  sql += " ORDER BY dm.created_at DESC";

  const countSql = sql.replace(
    /SELECT [\s\S]*?FROM/,
    "SELECT COUNT(*) as total FROM",
  ).replace(/ORDER BY dm.created_at DESC/, "");
  const countParams = [...params];

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  const total = db.prepare(countSql).get(...countParams) as { total: number };
  const rows = db.prepare(sql).all(...params);
  return { rows, total: total?.total || 0 };
}

/**
 * Set (or clear) an admin's district scope. Only meaningful for role
 * 'admin' — NULL district = full admin. super_admin is never scoped.
 */
export function setAdminAssignment(
  profileId: number,
  assignedDistrict: string | null,
  assignedUpazila: string | null,
) {
  const db = getDb();
  return db
    .prepare(
      "UPDATE profiles SET assigned_district = ?, assigned_upazila = ?, updated_at = datetime('now') WHERE id = ? AND role = 'admin'",
    )
    .run(assignedDistrict, assignedUpazila, profileId).changes;
}

/** Record that an admin accepted the admin policy & terms. */
export function recordAdminPolicyAcceptance(profileId: number) {
  const db = getDb();
  return db
    .prepare(
      "UPDATE profiles SET admin_policy_accepted_at = datetime('now') WHERE id = ? AND role IN ('admin', 'super_admin')",
    )
    .run(profileId).changes;
}

// ── Site Settings (key/value store) ───────────────────────────────────

export function getSiteSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM site_settings").all() as {
    key: string;
    value: string;
  }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value ?? "";
  return out;
}

export function updateSiteSettings(settings: Record<string, string>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (@key, @value, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = @value, updated_at = datetime('now')
  `);
  const tx = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      stmt.run({ key, value: value ?? "" });
    }
  });
  tx(Object.entries(settings));
  return Object.keys(settings).length;
}

// ── Email Log (audit trail for outbound emails) ──────────────────────

export function dbRecordEmailLog(entry: {
  type?: string | null;
  toEmail: string;
  requestId?: number | null;
  status: string;
  error?: string | null;
}) {
  const db = getDb();
  return db
    .prepare(
      `INSERT INTO email_log (type, to_email, request_id, status, error)
       VALUES (@type, @toEmail, @requestId, @status, @error)`,
    )
    .run({
      type: entry.type ?? null,
      toEmail: entry.toEmail,
      requestId: entry.requestId ?? null,
      status: entry.status,
      error: entry.error ?? null,
    }).lastInsertRowid as number;
}

// ── Activity Log (real audit trail) ───────────────────────────────────

export function recordActivityLog(entry: {
  actorId?: number | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}) {
  const db = getDb();
  return db
    .prepare(
      `INSERT INTO activity_log (actor_id, actor_email, action, entity_type, entity_id, details, ip_address)
       VALUES (@actorId, @actorEmail, @action, @entityType, @entityId, @details, @ipAddress)`,
    )
    .run({
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      details: entry.details ?? null,
      ipAddress: entry.ipAddress ?? null,
    }).lastInsertRowid as number;
}

export function getActivityLog(filters?: {
  limit?: number;
  offset?: number;
  action?: string;
  entityType?: string;
  actorId?: number;
  sinceHours?: number;
}) {
  const db = getDb();
  let sql = "SELECT * FROM activity_log WHERE 1=1";
  const params: any[] = [];
  if (filters?.action && filters.action !== "all") {
    sql += " AND action LIKE ?";
    params.push(`%${filters.action}%`);
  }
  if (filters?.entityType && filters.entityType !== "all") {
    sql += " AND entity_type = ?";
    params.push(filters.entityType);
  }
  if (filters?.actorId) {
    sql += " AND actor_id = ?";
    params.push(filters.actorId);
  }
  if (filters?.sinceHours) {
    sql += " AND created_at >= datetime('now', ?)";
    params.push(`-${filters.sinceHours} hours`);
  }
  sql += " ORDER BY created_at DESC";

  const countSql = sql
    .replace("SELECT *", "SELECT COUNT(*) as total")
    .replace(/ ORDER BY .*/, "");
  const countParams = [...params];

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  const total = db.prepare(countSql).get(...countParams) as { total: number };
  const rows = db.prepare(sql).all(...params);
  return { rows, total: total?.total || 0 };
}

// ── Contact messages (public contact-form submissions) ────────────────

export function insertContactMessage(entry: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): number {
  const db = getDb();
  return db
    .prepare(
      `INSERT INTO contact_messages (name, email, phone, subject, message, ip_address, user_agent)
       VALUES (@name, @email, @phone, @subject, @message, @ipAddress, @userAgent)`,
    )
    .run({
      name: entry.name,
      email: entry.email,
      phone: entry.phone ?? null,
      subject: entry.subject ?? null,
      message: entry.message,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    }).lastInsertRowid as number;
}

export function getContactMessages(filters?: {
  limit?: number;
  offset?: number;
  search?: string;
  unreadOnly?: boolean;
}) {
  const db = getDb();
  let sql = "SELECT * FROM contact_messages WHERE 1=1";
  const params: any[] = [];
  if (filters?.search) {
    sql += " AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)";
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }
  if (filters?.unreadOnly) {
    sql += " AND is_read = 0";
  }
  sql += " ORDER BY created_at DESC";

  const countSql = sql
    .replace("SELECT *", "SELECT COUNT(*) as total")
    .replace(/ ORDER BY .*/, "");
  const countParams = [...params];

  if (filters?.limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(filters.limit, filters.offset || 0);
  }

  const total = db.prepare(countSql).get(...countParams) as { total: number };
  const rows = db.prepare(sql).all(...params);
  return { rows, total: total?.total || 0 };
}

export function markContactMessageRead(id: number): boolean {
  const db = getDb();
  const result = db
    .prepare("UPDATE contact_messages SET is_read = 1 WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function getUnreadContactMessageCount(): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM contact_messages WHERE is_read = 0")
    .get() as { count: number };
  return row?.count || 0;
}


const SEED_DONORS = [
  {
    email: "rahman.ali@email.com",
    password_hash: "seed_hash_1",
    full_name_en: "Rahman Ali",
    full_name_bn: "রহমান আলী",
    phone: "01712345601",
    blood_group: "A+",
    role: "donor",
    district: "Rangpur",
    upazila: "Sadar",
    sex: "Male",
    is_active: 1,
    show_on_leaderboard: 1,
  },
  {
    email: "fatima.khatun@email.com",
    password_hash: "seed_hash_2",
    full_name_en: "Fatima Khatun",
    full_name_bn: "ফাতিমা খাতুন",
    phone: "01712345602",
    blood_group: "A-",
    role: "donor",
    district: "Dinajpur",
    upazila: "Sadar",
    sex: "Female",
    is_active: 1,
  },
  {
    email: "karim.hossain@email.com",
    password_hash: "seed_hash_3",
    full_name_en: "Karim Hossain",
    full_name_bn: "করিম হোসেন",
    phone: "01712345603",
    blood_group: "B+",
    role: "donor",
    district: "Kurigram",
    upazila: "Sadar",
    sex: "Male",
    is_active: 1,
    show_on_leaderboard: 1,
  },
  {
    email: "nusrat.jahan@email.com",
    password_hash: "seed_hash_4",
    full_name_en: "Nusrat Jahan",
    full_name_bn: "নুসরাত জাহান",
    phone: "01712345604",
    blood_group: "B-",
    role: "donor",
    district: "Lalmonirhat",
    upazila: "Sadar",
    sex: "Female",
    is_active: 1,
  },
  {
    email: "arif.ahmed@email.com",
    password_hash: "seed_hash_5",
    full_name_en: "Arif Ahmed",
    full_name_bn: "আরিফ আহমেদ",
    phone: "01712345605",
    blood_group: "AB+",
    role: "donor",
    district: "Nilphamari",
    upazila: "Sadar",
    sex: "Male",
    is_active: 1,
    show_on_leaderboard: 1,
  },
  {
    email: "sadia.akter@email.com",
    password_hash: "seed_hash_6",
    full_name_en: "Sadia Akter",
    full_name_bn: "সাদিয়া আক্তার",
    phone: "01712345606",
    blood_group: "AB-",
    role: "donor",
    district: "Gaibandha",
    upazila: "Sadar",
    sex: "Female",
    is_active: 1,
  },
  {
    email: "mamun.rashid@email.com",
    password_hash: "seed_hash_7",
    full_name_en: "Mamun Rashid",
    full_name_bn: "মামুন রশীদ",
    phone: "01712345607",
    blood_group: "O+",
    role: "donor",
    district: "Thakurgaon",
    upazila: "Sadar",
    sex: "Male",
    is_active: 1,
    show_on_leaderboard: 1,
  },
  {
    email: "tanzila.begum@email.com",
    password_hash: "seed_hash_8",
    full_name_en: "Tanzila Begum",
    full_name_bn: "তানজিলা বেগম",
    phone: "01712345608",
    blood_group: "O-",
    role: "donor",
    district: "Panchagarh",
    upazila: "Sadar",
    sex: "Female",
    is_active: 1,
  },
  {
    email: "joy.dev@email.com",
    password_hash: "seed_hash_9",
    full_name_en: "Joy Dev",
    full_name_bn: "জয় দেব",
    phone: "01712345609",
    blood_group: "A+",
    role: "donor",
    district: "Rangpur",
    upazila: "Mithapukur",
    sex: "Male",
    is_active: 1,
    show_on_leaderboard: 1,
  },
  {
    email: "riya.sarkar@email.com",
    password_hash: "seed_hash_10",
    full_name_en: "Riya Sarkar",
    full_name_bn: "রিয়া সরকার",
    phone: "01712345610",
    blood_group: "O+",
    role: "donor",
    district: "Rangpur",
    upazila: "Pirganj",
    sex: "Female",
    is_active: 1,
    show_on_leaderboard: 1,
  },
];

const SEED_DONATIONS = [
  {
    donor_id: 1,
    blood_group: "A+",
    units: 1,
    hospital_name: "Rangpur Medical College Hospital",
    donation_date: "2025-11-15",
  },
  {
    donor_id: 3,
    blood_group: "B+",
    units: 1,
    hospital_name: "Dinajpur Medical College",
    donation_date: "2025-12-01",
  },
  {
    donor_id: 7,
    blood_group: "O+",
    units: 2,
    hospital_name: "Rangpur Medical College Hospital",
    donation_date: "2025-10-20",
  },
  {
    donor_id: 7,
    blood_group: "O+",
    units: 1,
    hospital_name: "Thakurgaon Sadar Hospital",
    donation_date: "2025-08-05",
  },
  {
    donor_id: 9,
    blood_group: "A+",
    units: 1,
    hospital_name: "Rangpur Community Clinic",
    donation_date: "2025-09-18",
  },
  {
    donor_id: 1,
    blood_group: "A+",
    units: 1,
    hospital_name: "Rangpur Medical College Hospital",
    donation_date: "2025-06-22",
  },
  {
    donor_id: 5,
    blood_group: "AB+",
    units: 1,
    hospital_name: "Nilphamari Sadar Hospital",
    donation_date: "2025-07-10",
  },
  {
    donor_id: 10,
    blood_group: "O+",
    units: 1,
    hospital_name: "Pirganj Upazila Health Complex",
    donation_date: "2025-11-28",
  },
  // Current-month donation for Donor of the Month feature
  {
    donor_id: 7,
    blood_group: "O+",
    units: 1,
    hospital_name: "Rangpur Medical College Hospital",
    donation_date: new Date().toISOString().slice(0, 10),
  },
];

export function seedSampleData() {
  const db = getDb();
  const existingDonors = db
    .prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'donor'")
    .get() as { count: number };
  if (existingDonors.count > 0) {
    seedAdminAccounts(db);
    // Phase 5.2: Opt-in existing donors with donations to the leaderboard
    db.prepare(`
      UPDATE profiles SET show_on_leaderboard = 1
      WHERE role = 'donor' AND is_active = 1
        AND id IN (SELECT DISTINCT donor_id FROM donations)
        AND show_on_leaderboard = 0
    `).run();
    return;
  }

  const insertProfile = db.prepare(`
    INSERT INTO profiles (email, password_hash, full_name_en, full_name_bn, phone, blood_group, role, district, upazila, sex, is_active, show_on_leaderboard, is_approved, verification_status)
    VALUES (@email, @password_hash, @full_name_en, @full_name_bn, @phone, @blood_group, @role, @district, @upazila, @sex, @is_active, @show_on_leaderboard, 1, 'verified')
  `);
  const insertDonation = db.prepare(`
    INSERT INTO donations (donor_id, blood_group, units, hospital_name, donation_date)
    VALUES (@donor_id, @blood_group, @units, @hospital_name, @donation_date)
  `);

  const insertManyProfiles = db.transaction((donors: typeof SEED_DONORS) => {
    for (const d of donors) insertProfile.run(d);
  });
  const insertManyDonations = db.transaction((dons: typeof SEED_DONATIONS) => {
    for (const d of dons) insertDonation.run(d);
  });

  insertManyProfiles(SEED_DONORS);
  insertManyDonations(SEED_DONATIONS);
  seedAdminAccounts(db);
}

function seedAdminAccounts(db: Database.Database) {
  const adminAccounts = [
    {
      email: "miltonbabu9666@gmail.com",
      password_hash: "milton9666",
      full_name_en: "Milton Babu",
      full_name_bn: "মিল্টন বাবু",
      phone: "01712345678",
      blood_group: "A+",
      role: "super_admin",
      district: "rangpur",
      upazila: "rangpur_sadar",
      sex: "male",
      is_active: 1,
    },
    {
      email: "admin@trinomul.org",
      password_hash: "admin123",
      full_name_en: "Trinomul Admin",
      full_name_bn: "ত্রিনমুল অ্যাডমিন",
      phone: "01798765432",
      blood_group: "O+",
      role: "admin",
      district: "rangpur",
      upazila: "rangpur_sadar",
      sex: "male",
      is_active: 1,
    },
  ];

  const upsertAdmin = db.prepare(`
    INSERT OR REPLACE INTO profiles (email, password_hash, full_name_en, full_name_bn, phone, blood_group, role, district, upazila, sex, is_active)
    VALUES (@email, @password_hash, @full_name_en, @full_name_bn, @phone, @blood_group, @role, @district, @upazila, @sex, @is_active)
  `);

  for (const admin of adminAccounts) {
    const existing = db
      .prepare("SELECT id FROM profiles WHERE email = ?")
      .get(admin.email);
    if (!existing) {
      upsertAdmin.run(admin);
    } else {
      db.prepare(
        "UPDATE profiles SET role = @role, is_active = 1 WHERE email = @email",
      ).run({
        role: admin.role,
        email: admin.email,
      });
    }
  }
}

export function seedDonorEligibilityData() {
  const db = getDb();
  const donors = db
    .prepare("SELECT id, email FROM profiles WHERE role = 'donor' ORDER BY id")
    .all() as { id: number; email: string }[];

  const today = new Date();
  const eligibilityUpdates: {
    id: number;
    last_donation_date: string | null;
    last_donation_type: string;
  }[] = [];

  for (const donor of donors) {
    switch (donor.id % 10) {
      case 1:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2025-12-14",
          last_donation_type: "whole_blood",
        });
        break;
      case 2:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2026-02-22",
          last_donation_type: "whole_blood",
        });
        break;
      case 3:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2026-03-24",
          last_donation_type: "platelets",
        });
        break;
      case 4:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2026-04-03",
          last_donation_type: "plasma",
        });
        break;
      case 5:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: null,
          last_donation_type: "whole_blood",
        });
        break;
      case 6:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2026-01-03",
          last_donation_type: "whole_blood",
        });
        break;
      case 7:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2026-03-14",
          last_donation_type: "whole_blood",
        });
        break;
      case 8:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2026-04-08",
          last_donation_type: "platelets",
        });
        break;
      case 9:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: null,
          last_donation_type: "whole_blood",
        });
        break;
      case 0:
        eligibilityUpdates.push({
          id: donor.id,
          last_donation_date: "2026-03-19",
          last_donation_type: "plasma",
        });
        break;
    }
  }

  const updateStmt = db.prepare(
    `UPDATE profiles SET last_donation_date = @last_donation_date, last_donation_type = @last_donation_type WHERE id = @id`,
  );
  for (const u of eligibilityUpdates) {
    updateStmt.run(u);
  }

  return eligibilityUpdates.length;
}

export function getHomepageStats() {
  const db = getDb();
  const totalDonors =
    (
      db
        .prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'donor'")
        .get() as { count: number }
    ).count || 0;
  const activeRequests =
    (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active' AND archived_at IS NULL",
        )
        .get() as { count: number }
    ).count || 0;
  const totalDonations =
    (
      db.prepare("SELECT COUNT(*) as count FROM donations").get() as {
        count: number;
      }
    ).count || 0;
  const districts =
    (
      db
        .prepare(
          "SELECT COUNT(DISTINCT district) as count FROM profiles WHERE district IS NOT NULL AND district != ''",
        )
        .get() as { count: number }
    ).count || 0;
  return { totalDonors, activeRequests, totalDonations, districts };
}

// ── Bulk Operations ─────────────────────────────────────────────────────

export function bulkDeleteProfiles(ids: number[]): number {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => "?").join(", ");
  const stmt = db.prepare(
    `DELETE FROM profiles WHERE id IN (${placeholders}) AND role NOT IN ('admin', 'super_admin')`,
  );
  const result = stmt.run(...ids);
  return result.changes;
}

export function bulkDeactivateProfiles(ids: number[]): number {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => "?").join(", ");
  const stmt = db.prepare(
    `UPDATE profiles SET is_active = 0 WHERE id IN (${placeholders}) AND role NOT IN ('admin', 'super_admin')`,
  );
  const result = stmt.run(...ids);
  return result.changes;
}

export function bulkActivateProfiles(ids: number[]): number {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => "?").join(", ");
  const stmt = db.prepare(
    `UPDATE profiles SET is_active = 1 WHERE id IN (${placeholders})`,
  );
  const result = stmt.run(...ids);
  return result.changes;
}

export function bulkDeleteRequests(ids: number[]): number {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => "?").join(", ");
  db.prepare(`DELETE FROM request_translations WHERE request_id IN (${placeholders})`).run(...ids);
  const stmt = db.prepare(
    `UPDATE blood_requests SET status = 'deleted', archived_at = datetime('now') WHERE id IN (${placeholders})`,
  );
  const result = stmt.run(...ids);
  return result.changes;
}

export function bulkUpdateRequestStatus(ids: number[], status: string): number {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => "?").join(", ");
  const stmt = db.prepare(
    `UPDATE blood_requests SET status = ?, current_status = ? WHERE id IN (${placeholders})`,
  );
  const result = stmt.run(status, status, ...ids);
  return result.changes;
}

export function bulkDeleteDonations(ids: number[]): number {
  const db = getDb();
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => "?").join(", ");
  const stmt = db.prepare(
    `DELETE FROM donations WHERE id IN (${placeholders})`,
  );
  const result = stmt.run(...ids);
  return result.changes;
}

// ── Donor bookmarks ─────────────────────────────────────────────────────────
//
// A logged-in user can bookmark/save a donor for quick access. The
// donor_bookmarks table has a UNIQUE(user_id, donor_id) constraint.

/** Toggle a bookmark for the given donor. Returns true if now bookmarked. */
export function toggleBookmark(userId: number, donorId: number): boolean {
  const db = getDb();
  if (userId === donorId) return false;

  const existing = db
    .prepare("SELECT 1 FROM donor_bookmarks WHERE user_id = ? AND donor_id = ?")
    .get(userId, donorId);

  if (existing) {
    db.prepare(
      "DELETE FROM donor_bookmarks WHERE user_id = ? AND donor_id = ?",
    ).run(userId, donorId);
    return false;
  }

  db.prepare(
    "INSERT INTO donor_bookmarks (user_id, donor_id) VALUES (?, ?)",
  ).run(userId, donorId);
  return true;
}

/** Check if a user has bookmarked a specific donor. */
export function isBookmarked(userId: number, donorId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM donor_bookmarks WHERE user_id = ? AND donor_id = ?")
    .get(userId, donorId);
  return !!row;
}

/** Return all donor IDs bookmarked by the given user. */
export function getBookmarkedDonorIds(userId: number): number[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT donor_id FROM donor_bookmarks WHERE user_id = ? ORDER BY created_at DESC",
    )
    .all(userId) as { donor_id: number }[];
  return rows.map((r) => r.donor_id);
}

/** Return full donor profiles bookmarked by the given user. */
export function getBookmarkedDonors(userId: number): Record<string, unknown>[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.* FROM donor_bookmarks b
       JOIN profiles p ON p.id = b.donor_id
       WHERE b.user_id = ? AND p.role = 'donor'
       ORDER BY b.created_at DESC`,
    )
     .all(userId) as Record<string, unknown>[];
  return rows;
}

// ── Presence tracking ──────────────────────────────────────────────────────

export function updateLastActive(userId: number): void {
  const db = getDb();
  const now = new Date().toISOString();

  const row = db
    .prepare("SELECT last_active_at FROM profiles WHERE id = ?")
    .get(userId) as { last_active_at: string | null } | undefined;

  if (row?.last_active_at) {
    try {
      const last = new Date(
        row.last_active_at.includes("T")
          ? row.last_active_at
          : row.last_active_at.replace(" ", "T") + "Z",
      ).getTime();
      // eslint-disable-next-line react-hooks/purity
      if (Date.now() - last < 4 * 60 * 1000) return;
    } catch {
      /* fall through and update */
    }
  }

  db.prepare("UPDATE profiles SET last_active_at = ? WHERE id = ?").run(
    now,
    userId,
  );
}

// ── Donor contact click tracking ───────────────────────────────────────────

export interface DonorContactClick {
  id: number;
  donor_id: number;
  button_type: "call" | "whatsapp";
  clicker_ip: string | null;
  clicker_user_id: number | null;
  clicker_user_name: string | null;
  created_at: string;
}

export interface DonorContactClickStats {
  totalCall: number;
  totalWhatsapp: number;
  totalClicks: number;
  uniqueClickers: number;
  recentClicks: DonorContactClick[];
}

/** Record a contact button click. */
export function recordContactClick(
  donorId: number,
  buttonType: "call" | "whatsapp",
  clickerIp: string | null,
  clickerUserId: number | null,
  clickerUserName: string | null,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO donor_contact_clicks (donor_id, button_type, clicker_ip, clicker_user_id, clicker_user_name)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(donorId, buttonType, clickerIp, clickerUserId, clickerUserName);
}

/** Get contact click stats for a donor (for admin panel). */
export function getDonorContactClickStats(donorId: number): DonorContactClickStats {
  const db = getDb();

  const totals = db
    .prepare(
      `SELECT
        SUM(CASE WHEN button_type = 'call' THEN 1 ELSE 0 END) as total_call,
        SUM(CASE WHEN button_type = 'whatsapp' THEN 1 ELSE 0 END) as total_whatsapp,
        COUNT(*) as total_clicks,
        COUNT(DISTINCT COALESCE(clicker_user_id, clicker_ip)) as unique_clickers
       FROM donor_contact_clicks WHERE donor_id = ?`,
    )
    .get(donorId) as { total_call: number; total_whatsapp: number; total_clicks: number; unique_clickers: number } | undefined;

  const recentClicks = db
    .prepare(
      `SELECT * FROM donor_contact_clicks WHERE donor_id = ? ORDER BY created_at DESC LIMIT 20`,
    )
    .all(donorId) as DonorContactClick[];

  return {
    totalCall: totals?.total_call ?? 0,
    totalWhatsapp: totals?.total_whatsapp ?? 0,
    totalClicks: totals?.total_clicks ?? 0,
    uniqueClickers: totals?.unique_clickers ?? 0,
    recentClicks,
  };
}
