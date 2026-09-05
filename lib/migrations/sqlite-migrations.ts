import { createLogger } from "@/lib/logging/logger";

const logger = createLogger("migrations");

type AnyDb = any;

let _getDb: null | ((config?: any) => AnyDb) = null;

async function getDbFn() {
  if (!_getDb) {
    const mod = await import("@/lib/database");
    _getDb = mod.getDb;
  }
  return _getDb;
}

export interface Migration {
  id: string;
  name: string;
  up: (db: AnyDb) => void;
  down?: (db: AnyDb) => void;
}

const migrations: Migration[] = [
  {
    id: "001_initial_schema",
    name: "Initial schema creation",
    up: (db) => {
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS blood_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_name TEXT NOT NULL,
          blood_group TEXT NOT NULL,
          hospital_name TEXT NOT NULL,
          hospital_address TEXT,
          district TEXT NOT NULL,
          upazila TEXT NOT NULL,
          urgency_level TEXT DEFAULT 'normal',
          when_needed TEXT DEFAULT 'now',
          needed_date DATE,
          needed_time TIME,
          units_needed INTEGER DEFAULT 1,
          reason TEXT,
          phone TEXT,
          contact_number TEXT,
          alternative_number TEXT,
          whatsapp_number TEXT,
          lat REAL,
          lng REAL,
          tracking_code TEXT UNIQUE,
          status TEXT DEFAULT 'active',
          current_status TEXT DEFAULT 'submitted',
          is_last_chance INTEGER DEFAULT 0,
          show_fulfilled_badge INTEGER DEFAULT 1,
          admin_notice TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          archived_at DATETIME
        );
        
        CREATE TABLE IF NOT EXISTS donations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          donor_id INTEGER NOT NULL,
          request_id INTEGER,
          donation_type TEXT DEFAULT 'whole_blood',
          units INTEGER DEFAULT 1,
          donated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGN KEY (donor_id) REFERENCES profiles(id),
          FOREIGN KEY (request_id) REFERENCES blood_requests(id)
        );
        
        CREATE TABLE IF NOT EXISTS auth_rate_limits (
          identifier TEXT PRIMARY KEY,
          attempt_count INTEGER DEFAULT 0,
          first_attempt_at INTEGER NOT NULL,
          last_attempt_at INTEGER NOT NULL,
          locked_until INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS password_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at INTEGER NOT NULL,
          used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON profiles(blood_group);
        CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district);
        CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
        CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
        CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON blood_requests(blood_group);
        CREATE INDEX IF NOT EXISTS idx_blood_requests_district ON blood_requests(district);
        CREATE INDEX IF NOT EXISTS idx_blood_requests_created_at ON blood_requests(created_at);
      `);
    },
  },
  {
    id: "002_activity_log_table",
    name: "Add activity_log table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          actor_id INTEGER,
          actor_role TEXT,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
        CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
      `);
    },
  },
  {
    id: "003_social_tables",
    name: "Add social tables (posts, likes, comments)",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS social_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          author_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          image_url TEXT,
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES profiles(id)
        );
        
        CREATE TABLE IF NOT EXISTS social_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES profiles(id),
          UNIQUE(post_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS social_comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES profiles(id)
        );
      `);
    },
  },
  {
    id: "004_donor_matches_table",
    name: "Add donor_matches table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS donor_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          donor_id INTEGER NOT NULL,
          distance_km REAL,
          status TEXT DEFAULT 'pending',
          contacted_at DATETIME,
          responded_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES blood_requests(id),
          FOREIGN KEY (donor_id) REFERENCES profiles(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_donor_matches_request ON donor_matches(request_id);
        CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON donor_matches(donor_id);
      `);
    },
  },
  {
    id: "005_request_status_log",
    name: "Add request_status_log table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS request_status_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          old_status TEXT,
          new_status TEXT,
          changed_by INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES blood_requests(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_status_log_request ON request_status_log(request_id);
      `);
    },
  },
  {
    id: "006_saved_patients",
    name: "Add saved_patients table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS saved_patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_name TEXT NOT NULL,
          blood_group TEXT NOT NULL,
          hospital_name TEXT,
          phone TEXT,
          notes TEXT,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES profiles(id)
        );
      `);
    },
  },
  {
    id: "007_organizations_table",
    name: "Add organizations table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS organizations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT CHECK(type IN ('hospital', 'blood_bank', 'donor_center', 'other')),
          address TEXT,
          district TEXT,
          upazila TEXT,
          phone TEXT,
          email TEXT,
          contact_person TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_orgs_district ON organizations(district);
      `);
    },
  },
  {
    id: "008_add_remember_me",
    name: "Add remember_me column to profiles",
    up: (db) => {
      db.exec(`
        ALTER TABLE profiles ADD COLUMN remember_token TEXT;
        ALTER TABLE profiles ADD COLUMN remember_token_expires_at INTEGER;
      `);
    },
  },
  {
    id: "009_add_distance_km",
    name: "Add distance_km column to blood_requests",
    up: (db) => {
      db.exec(`
        ALTER TABLE blood_requests ADD COLUMN distance_km REAL;
      `);
    },
  },
  {
    id: "010_add_verified_phone",
    name: "Add phone_verified column to profiles",
    up: (db) => {
      db.exec(`
        ALTER TABLE profiles ADD COLUMN phone_verified INTEGER DEFAULT 0;
        ALTER TABLE profiles ADD COLUMN phone_verification_token TEXT;
        ALTER TABLE profiles ADD COLUMN phone_verification_expires_at INTEGER;
      `);
    },
  },
  {
    id: "011_add_donor_nid_verification",
    name: "Add NID + admin verification columns to profiles",
    up: (db) => {
      db.exec(`
        ALTER TABLE profiles ADD COLUMN nid_number TEXT;
        ALTER TABLE profiles ADD COLUMN nid_front_url TEXT;
        ALTER TABLE profiles ADD COLUMN nid_back_url TEXT;
        ALTER TABLE profiles ADD COLUMN nid_uploaded_at TEXT;
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT 0;
        ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified';
        ALTER TABLE profiles ADD COLUMN verified_by_admin_id INTEGER;
        ALTER TABLE profiles ADD COLUMN verified_at TEXT;
        ALTER TABLE profiles ADD COLUMN verification_note TEXT;
        CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);
        CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
      `);
    },
  },
  {
    id: "012_add_donor_presence_and_response_metrics",
    name: "Add last_active_at + response metrics + anonymous mode to profiles",
    up: (db) => {
      db.exec(`
        ALTER TABLE profiles ADD COLUMN last_active_at TEXT;
        ALTER TABLE profiles ADD COLUMN response_count INTEGER DEFAULT 0;
        ALTER TABLE profiles ADD COLUMN response_total_ms INTEGER DEFAULT 0;
        ALTER TABLE profiles ADD COLUMN is_anonymous BOOLEAN DEFAULT 0;
      `);
    },
  },
  {
    id: "013_add_donor_bookmarks",
    name: "Create donor_bookmarks table",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS donor_bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          donor_id INTEGER NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(user_id, donor_id),
          FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
          FOREIGN KEY (donor_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_donor_bookmarks_user ON donor_bookmarks(user_id);
        CREATE INDEX IF NOT EXISTS idx_donor_bookmarks_donor ON donor_bookmarks(donor_id);
      `);
    },
  },
  {
    id: "014_add_donor_contact_clicks",
    name: "Create donor_contact_clicks table",
    up: (db) => {
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
        );
        CREATE INDEX IF NOT EXISTS idx_donor_contact_clicks_donor ON donor_contact_clicks(donor_id);
        CREATE INDEX IF NOT EXISTS idx_donor_contact_clicks_created ON donor_contact_clicks(created_at);
      `);
    },
  },
  {
    id: "015_add_view_count",
    name: "Add view_count column to blood_requests",
    up: (db) => {
      db.exec(`
        ALTER TABLE blood_requests ADD COLUMN view_count INTEGER DEFAULT 0;
      `);
    },
  },
  {
    id: "016_add_union_name",
    name: "Add union_name column for union-level location breakdown",
    up: (db) => {
      db.exec(`
        ALTER TABLE profiles ADD COLUMN union_name TEXT;
        ALTER TABLE blood_requests ADD COLUMN union_name TEXT;
      `);
    },
  },
];

function getMigrationTable(db: AnyDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function getAppliedMigrations(db: AnyDb): string[] {
  const rows = db
    .prepare("SELECT migration_id FROM schema_migrations ORDER BY migration_id")
    .all() as { migration_id: string }[];
  return rows.map((r) => r.migration_id);
}

function markMigrationApplied(
  db: AnyDb,
  migration: Migration,
): void {
  db.prepare(
    "INSERT INTO schema_migrations (migration_id, name) VALUES (?, ?)",
  ).run(migration.id, migration.name);
}

export async function runMigrations(): Promise<{
  applied: string[];
  failed: { migration: string; error: string }[];
}> {
  const getDb = await getDbFn();
  const db = getDb();
  const applied: string[] = [];
  const failed: { migration: string; error: string }[] = [];

  logger.info("Starting database migrations");

  getMigrationTable(db);
  const appliedMigrations = getAppliedMigrations(db);

  for (const migration of migrations) {
    if (appliedMigrations.includes(migration.id)) {
      continue;
    }

    logger.info(`Applying migration: ${migration.id} - ${migration.name}`);

    try {
      migration.up(db);
      markMigrationApplied(db, migration);
      applied.push(migration.id);
      logger.info(`Migration applied successfully: ${migration.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Migration failed: ${migration.id}`, {
        error: errorMsg,
      });
      failed.push({ migration: migration.id, error: errorMsg });
      break;
    }
  }

  logger.info("Migration run complete", {
    applied: applied.length,
    failed: failed.length,
  });

  return { applied, failed };
}

export async function getPendingMigrations(): Promise<Migration[]> {
  const getDb = await getDbFn();
  const db = getDb();
  getMigrationTable(db);
  const appliedMigrations = getAppliedMigrations(db);

  return migrations.filter((m) => !appliedMigrations.includes(m.id));
}

export async function getMigrationStatus(): Promise<{
  total: number;
  applied: number;
  pending: Migration[];
}> {
  const getDb = await getDbFn();
  const db = getDb();
  getMigrationTable(db);
  const appliedMigrations = getAppliedMigrations(db);

  return {
    total: migrations.length,
    applied: appliedMigrations.length,
    pending: migrations.filter((m) => !appliedMigrations.includes(m.id)),
  };
}

export async function runMigrationById(id: string): Promise<boolean> {
  const getDb = await getDbFn();
  const db = getDb();
  const migration = migrations.find((m) => m.id === id);

  if (!migration) {
    logger.error(`Migration not found: ${id}`);
    return false;
  }

  getMigrationTable(db);
  const appliedMigrations = getAppliedMigrations(db);

  if (appliedMigrations.includes(id)) {
    logger.info(`Migration already applied: ${id}`);
    return true;
  }

  try {
    migration.up(db);
    markMigrationApplied(db, migration);
    logger.info(`Migration applied: ${id}`);
    return true;
  } catch (err) {
    logger.error(`Migration failed: ${id}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}