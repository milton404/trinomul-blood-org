# Plan: Request Lifecycle, Admin History, Reference System & Donor Card Upgrades

## Context
Next.js + better-sqlite3 app (`data/bloodbank.db` via `lib/db.ts`, server actions in `lib/db-actions.ts`).
Currently: requests expire lazily via `expireStaleBloodRequests()` but expired/fulfilled/cancelled cards still show on the frontend `/requests` page (user saw "expired 9, fulfilled 1, cancelled 1" with no clean view). No auto-hide, no fulfilled seal, no admin create-request, no referrer system, no user self-delete.

## Confirmed decisions (from user)
1. Fulfilled → card stays with "Completed" seal until **end of next day**, then hidden from frontend.
2. Lifecycle: regular request passes needed time unfulfilled → **1 day "Last Chance" pinned at top** (below critical/urgent) → hidden. Future-dated: needed time passes → **2 more days visible** (final day pinned) → hidden.
3. **Soft-delete only** — nothing hard-deleted automatically; admin keeps full history forever.
4. Referrer can be **anyone**: registered user (picker) OR free-text name + phone.

---

## 1. Database changes — `lib/db.ts` (`initTables`, ALTER pattern like existing)

`blood_requests` new columns:
- `archived_at TEXT` (NULL = visible on frontend)
- `archive_reason TEXT` — 'expired' | 'fulfilled' | 'cancelled' | 'deleted_by_user'
- `fulfilled_at TEXT`
- `show_fulfilled_badge INTEGER DEFAULT 1` — admin toggle for the Completed seal
- `admin_notice TEXT` — admin-written important notice shown on the card
- `referrer_profile_id INTEGER`, `referrer_name TEXT`, `referrer_phone TEXT`

`donations` new columns:
- `referrer_profile_id INTEGER`, `referrer_name TEXT`, `referrer_phone TEXT`

## 2. Lifecycle engine — `lib/db.ts`

Replace `expireStaleBloodRequests()` with `runRequestLifecycleSweep()` (same lazy pattern, runs on every read — no cron):

- Compute `neededExpiry` per request (existing when_needed logic; for `specific_date` use `needed_date` + `needed_time` when set).
- **active → expired+archived**: now > neededExpiry + grace, where grace = 1 day (regular) / 2 days (future-dated). Sets `status='expired'`, `archived_at`, `archive_reason='expired'`, writes `request_status_log` entry.
- **fulfilled → archived**: now > endOfDay(`fulfilled_at` + 1 day). Sets `archived_at`, `archive_reason='fulfilled'`.
- **cancelled / deleted_by_user**: archived immediately at the moment of the action (not in sweep).

New/updated queries in `lib/db.ts`:
- `getVisibleBloodRequests()` — `WHERE archived_at IS NULL` (active + last-chance + recently-fulfilled); each row gets computed flags: `is_last_chance`, `ms_until_archive`.
- `getRequestHistory({status, limit, offset})` — archived records for admin, plus `getRequestStatusCounts()` (active / last_chance / fulfilled / expired / cancelled / deleted counts).
- `getTopReferrers(limit)` — aggregate fulfilled referrals from `donations` grouped by `COALESCE(referrer_profile_id, referrer_phone, referrer_name)`, join profile when available.
- `getDonorsWithStats()` — add `total_referrals` per donor; `computeBadges()` gains referrer badges: "Connector" (≥3 refs), "Super Connector" (≥10 refs).
- `updateRequestStatus('cancelled')` path sets `archived_at` immediately.

## 3. Server actions — `lib/db-actions.ts`

- `serverGetVisibleBloodRequests()`
- `serverGetRequestHistory(filters)` + `serverGetRequestStatusCounts()`
- `serverMarkRequestFulfilled({ requestId, donorId, donationType, units, showBadge, adminNotice, referrerProfileId?, referrerName?, referrerPhone? })` — creates donation, sets status/fulfilled_at/badge/notice/referrer, status log, activity log.
- `serverAdminCreateBloodRequest(data)` — wraps `createBloodRequest` with `requester_type='admin'`.
- `serverArchiveOwnRequest(requestId, userId)` — validates `requester_id === userId`, sets `archived_at` + reason 'deleted_by_user'.
- `serverGetTopReferrers(limit)`

## 4. Frontend

**`app/[locale]/(main)/requests/page.tsx`**
- Switch to `serverGetVisibleBloodRequests()`; remove frontend status filter for expired/cancelled (they never arrive).
- Sort: critical → urgent → **last-chance pinned** → normal (last-chance always above normal regardless of its own urgency label).
- Optional "Last Chance" section header above pinned cards.

**`components/requests/RequestCard.tsx`**
- `status='fulfilled'` + `show_fulfilled_badge` → green "✓ Completed / সম্পন্ন" seal overlay; hide record-donation button.
- `is_last_chance` → pulsing amber/red "Last Chance / শেষ সুযোগ" badge.
- `admin_notice` → highlighted notice strip on the card.
- Record-donation modal: add referrer section — registered-user search picker (reuse donor search pattern) + free-text name/phone fallback.

**`app/[locale]/page.tsx` (homepage)** — use visible-requests query (active + last-chance only, no fulfilled seal clutter).

**`app/[locale]/(main)/profile/page.tsx`** — new "My Requests" section: user's own requests with status + Delete button → `serverArchiveOwnRequest` (instant hide, kept for admin).

## 5. Admin panel

**`app/[locale]/(main)/admin/blood-requests/page.tsx`**
- Status tabs with counts: Active | Last Chance | Fulfilled | Expired | Cancelled | Deleted by user | All — solves the "no way to view the 11" problem.
- **"Create Request"** button + full modal form (patient, blood group, units, urgency, when_needed/date/time, district/upazila, hospital, contacts, reason) → `serverAdminCreateBloodRequest`.
- **Mark Fulfilled modal**: pick donor (existing search), donation type/units, referrer picker (registered user OR name+phone), toggle "Show Completed seal on card", optional admin notice.
- Cancel action → instant archive; hard delete stays available for spam only.
- Edit modal: add `admin_notice` field.

**`components/admin/AddDonationModal.tsx`** — add referrer fields (picker + free text).

## 6. Leaderboard & donor card

**`app/[locale]/(main)/leaderboard/page.tsx`** — add "Top Referrers" tab alongside Top Donors (rank, name, referral count; full ranking naturally shows top and bottom).

**`components/donors/DonorCard.tsx`** — add:
- Referral chip: "🤝 N Referrals" next to donations count.
- Referrer badges via existing badge row (Connector / Super Connector).
- "Lives saved" estimate (units × 1) line under donations count.

## 7. i18n — `messages/en.json` + `messages/bn.json`
New keys: last_chance, completed_seal, my_requests, delete_request, referrer_* labels, history tab labels, create_request, mark_fulfilled fields, top_referrers, referrals_count.

## 8. Tests — `__tests__/`
Add unit tests for the lifecycle sweep timing (regular 1-day grace, future 2-day grace, fulfilled end-of-next-day archive) using injected `now`.

---

## Critical files
| File | Change |
|---|---|
| `lib/db.ts` | Schema columns, lifecycle sweep, visible/history/referrer queries |
| `lib/db-actions.ts` | New server actions |
| `app/[locale]/(main)/requests/page.tsx` | Visible-only feed + pinned sort |
| `components/requests/RequestCard.tsx` | Seal, last-chance badge, notice, referrer in modal |
| `app/[locale]/page.tsx` | Homepage query |
| `app/[locale]/(main)/profile/page.tsx` | My Requests + delete |
| `app/[locale]/(main)/admin/blood-requests/page.tsx` | Tabs+counts, create modal, fulfill modal |
| `components/admin/AddDonationModal.tsx` | Referrer fields |
| `app/[locale]/(main)/leaderboard/page.tsx` | Top Referrers tab |
| `components/donors/DonorCard.tsx` | Referral chip + badges |
| `messages/en.json`, `messages/bn.json` | New strings |
| `__tests__/` | Lifecycle timing tests |
