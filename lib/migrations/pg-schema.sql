-- ===========================================================================
-- Trinomul Blood Bank — PostgreSQL schema (Supabase)
-- Mirrors the SQLite schema in lib/db.ts (initTables) with proper Postgres
-- types. Integer auto-increment IDs are preserved as BIGSERIAL so the app's
-- existing integer-based query layer can be ported without changing IDs.
-- Idempotent: safe to run repeatedly.
-- ===========================================================================

-- ── profiles ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name_en TEXT,
  full_name_bn TEXT,
  phone TEXT,
  blood_group TEXT,
  role TEXT NOT NULL DEFAULT 'donor'
    CHECK (role IN ('donor', 'patient', 'hospital', 'admin', 'super_admin')),
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
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  weight_kg DOUBLE PRECISION,
  alternative_phone TEXT,
  whatsapp_number TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'call',
  occupation TEXT,
  has_chronic_disease BOOLEAN NOT NULL DEFAULT FALSE,
  disease_details TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  last_donation_type TEXT NOT NULL DEFAULT 'whole_blood',
  organization_id BIGINT NOT NULL DEFAULT 1,
  show_on_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
  hb_level DOUBLE PRECISION,
  last_hb_test_date TEXT,
  union_name TEXT,
  email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  nid_number TEXT,
  nid_front_url TEXT,
  nid_back_url TEXT,
  nid_uploaded_at TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  verified_by_admin_id BIGINT,
  verified_at TEXT,
  verification_note TEXT,
  last_active_at TEXT,
  response_count INTEGER NOT NULL DEFAULT 0,
  response_total_ms INTEGER NOT NULL DEFAULT 0,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_district TEXT,
  assigned_upazila TEXT,
  admin_policy_accepted_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

-- ── organizations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id BIGSERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_bn TEXT,
  description TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  district TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── blood_requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blood_requests (
  id BIGSERIAL PRIMARY KEY,
  requester_id BIGINT,
  requester_type TEXT NOT NULL DEFAULT 'user',
  patient_name TEXT NOT NULL,
  patient_age INTEGER,
  blood_group TEXT NOT NULL
    CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_needed INTEGER NOT NULL DEFAULT 1,
  urgency_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency_level IN ('normal', 'urgent', 'critical')),
  when_needed TEXT NOT NULL DEFAULT 'today',
  needed_date TEXT,
  needed_time TEXT,
  district TEXT,
  upazila TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  hospital_name TEXT,
  hospital_address TEXT,
  contact_number TEXT,
  alternative_number TEXT,
  whatsapp_number TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled')),
  donor_id BIGINT,
  donated_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  organization_id BIGINT NOT NULL DEFAULT 1,
  archived_at TEXT,
  archive_reason TEXT,
  fulfilled_at TEXT,
  show_fulfilled_badge BOOLEAN NOT NULL DEFAULT TRUE,
  admin_notice TEXT,
  edited_at TEXT,
  edit_count INTEGER NOT NULL DEFAULT 0,
  referrer_profile_id BIGINT,
  referrer_name TEXT,
  referrer_phone TEXT,
  patient_hb_level DOUBLE PRECISION,
  union_name TEXT,
  tracking_code TEXT UNIQUE,
  current_status TEXT NOT NULL DEFAULT 'submitted',
  boosted_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_district ON blood_requests(district);
CREATE INDEX IF NOT EXISTS idx_blood_requests_created_at ON blood_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_blood_requests_requester ON blood_requests(requester_id);

-- ── donations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id BIGSERIAL PRIMARY KEY,
  donor_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id BIGINT REFERENCES blood_requests(id) ON DELETE SET NULL,
  blood_group TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  hospital_name TEXT,
  donation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_type TEXT NOT NULL DEFAULT 'Patient',
  notes TEXT,
  donation_type TEXT NOT NULL DEFAULT 'whole_blood',
  referrer_profile_id BIGINT,
  referrer_name TEXT,
  referrer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_request ON donations(request_id);

-- ── social_posts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
  id BIGSERIAL PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_role TEXT,
  content TEXT,
  images TEXT,
  post_type TEXT NOT NULL DEFAULT 'general'
    CHECK (post_type IN ('general', 'donation_update', 'admin_announcement', 'blood_request')),
  related_request_id BIGINT,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deleted')),
  share_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at);

CREATE TABLE IF NOT EXISTS social_post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_likes_post ON social_post_likes(post_id);

CREATE TABLE IF NOT EXISTS social_post_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_role TEXT,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_post_comments(post_id);

CREATE TABLE IF NOT EXISTS social_post_shares (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- ── stories (Instagram-style, auto-expire after 24h) ──────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id BIGSERIAL PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

-- ── social_post_saves (post bookmarks, separate from donor bookmarks) ──────
CREATE TABLE IF NOT EXISTS social_post_saves (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_saves_post ON social_post_saves(post_id);

-- ── push_subscriptions (PWA web push) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── story_views (who viewed each story) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS story_views (
  id BIGSERIAL PRIMARY KEY,
  story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);

-- ── notifications (in-app: likes, comments, etc.) ──────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id BIGINT REFERENCES social_posts(id) ON DELETE CASCADE,
  content TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- ── auth_rate_limits ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  identifier TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  first_attempt_at BIGINT NOT NULL,
  last_attempt_at BIGINT NOT NULL,
  locked_until BIGINT
);

-- ── password_resets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- ── request_status_log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_status_log (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_log_request ON request_status_log(request_id);

-- ── request_edit_history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_edit_history (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  editor_type TEXT NOT NULL CHECK (editor_type IN ('guest', 'user', 'admin')),
  editor_id BIGINT,
  editor_email TEXT,
  editor_ip TEXT,
  editor_name TEXT,
  previous_values TEXT,
  new_values TEXT,
  changed_fields TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edit_history_request ON request_edit_history(request_id);

-- ── request_translations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_translations (
  request_id BIGINT PRIMARY KEY REFERENCES blood_requests(id) ON DELETE CASCADE,
  bn_text TEXT NOT NULL,
  bn_fields TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── donor_matches ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donor_matches (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_rank INTEGER NOT NULL DEFAULT 0,
  match_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  notification_method TEXT NOT NULL DEFAULT 'sms',
  response_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (response_status IN ('pending', 'accepted', 'declined', 'no_response')),
  responded_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_matches_request ON donor_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_donor_matches_donor ON donor_matches(donor_id);

-- ── saved_patients ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_patients (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  blood_group TEXT,
  relation TEXT,
  condition_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_patients_owner ON saved_patients(owner_id);

-- ── site_settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── activity_log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- ── donor_bookmarks ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donor_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  donor_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, donor_id)
);

CREATE INDEX IF NOT EXISTS idx_donor_bookmarks_user ON donor_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_donor_bookmarks_donor ON donor_bookmarks(donor_id);

-- ── donor_contact_clicks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donor_contact_clicks (
  id BIGSERIAL PRIMARY KEY,
  donor_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  button_type TEXT NOT NULL CHECK (button_type IN ('call', 'whatsapp')),
  clicker_ip TEXT,
  clicker_user_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  clicker_user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donor_contact_clicks_donor ON donor_contact_clicks(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_contact_clicks_created ON donor_contact_clicks(created_at);

-- ── email_log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id BIGSERIAL PRIMARY KEY,
  type TEXT,
  to_email TEXT,
  request_id BIGINT,
  status TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── email_templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  key TEXT PRIMARY KEY,
  subject TEXT,
  body TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── email_settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── contact_messages (public contact-form submissions) ─────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON contact_messages(is_read);

-- ── schema_migrations (tracking) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  migration_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── default organization seed ─────────────────────────────────────────────
INSERT INTO organizations (id, name_en, name_bn, description, contact_phone, contact_email, district)
SELECT 1, 'Trinomul Blood Bank', 'ত্রিণমূল ব্লাড ব্যাংক',
       'Community-based voluntary blood donation organization in Rangpur, Bangladesh.',
       '01734449666', 'contact@trinomul.org', 'Rangpur'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = 1);