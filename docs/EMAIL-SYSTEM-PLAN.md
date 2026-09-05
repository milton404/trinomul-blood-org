# 📧 Resend Email System — Implementation Plan

> Trinomul Blood Bank · Rangpur
> Goal: A full transactional email system powered by **Resend**, centered on
> **automatic blood-request alert emails to nearby eligible donors**, plus a
> branded template system for every other email service (forgot password,
> registration, welcome, etc.).

***

## 1. What We Already Have

| Piece                        | Status                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `resend` npm package         | ✅ Installed (`package.json`)                                                                                |
| `RESEND_API_KEY` env support | ✅ `.env.example` has the slot                                                                               |
| `lib/email.ts`               | ✅ Basic Resend client + 1 template (donor-application rejection)                                            |
| Donor matching engine        | ✅ `findMatchingDonors()` in `lib/db.ts` (blood-group, distance/Haversine, eligibility, 90-day cooldown)     |
| Location data                | ✅ `lib/constants/rangpur.ts` (districts, upazilas incl. Paglapir & Rangpur Sadar, unions, with lat/lng)     |
| Blood request creation hook  | ✅ `serverCreateBloodRequest()` in `lib/db-actions.ts` (already runs background jobs after creation)         |
| Donor profiles               | ✅ `profiles` table with `email`, `lat/lng`, `district`, `upazila`, `union_name`, `blood_group`, `is_active` |

So this plan is about **extending**, not building from scratch.

***

## 2. Donor Alert Email — Targeting Rules

### 2.1 When a blood request is posted

A background task fires (same pattern as the existing BN-translation `setTimeout`
in `serverCreateBloodRequest`) and selects donors to email.

### 2.2 Recipient selection logic

```
IF request is in Paglapir OR Rangpur Sadar OR a union of Rangpur Sadar:
    Recipients =
        (donors within 5 km of request location, same blood group)
        + (donors in the SAME union, same blood group)
        + (donors in Rangpur Sadar, same blood group)

ELSE (any other zila / upazila):
    Recipients = donors in THAT upazila, same blood group
```

### 2.3 Eligibility filter (applied to every recipient)

A donor is excluded if any of these is true:

- ❌ `is_active = 0` (deactivated account)

- ❌ Blood group is not compatible (exact same group — exact match only for emails,
  compatible groups stay a WhatsApp/panel feature)

- ❌ Donated whole blood **within the last 90 days (3 months)** — not fully recovered

- ❌ No email address on file

- ❌ Ineligible per existing rules (Hb level too low, platelets < 14 days, plasma < 30 days)

### 2.4 Cap

- **Max 15 recipients per request**, chosen by best ranking:

  1. Exact distance (closest first) for the 5 km ring
  2. Same-union donors
  3. Then Rangpur Sadar (for Rangpur-area requests) / same-upazila donors

- Rank using the existing `rankDonorCandidates()` scoring so ordering stays
  consistent with the admin Donor Match panel.

### 2.5 What the email contains

| Field                      | Source                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Patient name               | `patient_name`                                                                            |
| Blood group                | `blood_group` (big, red, prominent)                                                       |
| Location                   | `hospital_name`, `hospital_address`, `district`, `upazila` + Google Maps link (`lat/lng`) |
| Contact number             | `contact_number` (tel: link)                                                              |
| Reason                     | `reason`                                                                                  |
| Units needed + when needed | `units_needed`, `when_needed` / `needed_date`                                             |
| Urgency badge              | `urgency_level` (normal / urgent / critical styling)                                      |
| Track link                 | `/{locale}/track/{tracking_code}`                                                         |
| Call-to-action buttons     | 📞 Call now · 🗺️ View on map · 🔗 Track request                                          |

***

## 3. Architecture

```
app/api or server action (request created)
        │
        ▼
lib/email/dispatch.ts        ← decides WHICH emails to send (recipient selection)
        │
        ├─ lib/email/recipients.ts   ← donor query w/ geo + eligibility + cap 15
        │      (reuses findMatchingDonors + union/upazila filters)
        │
        ├─ lib/email/templates/*.ts  ← branded HTML templates (one per service)
        │
        ├─ lib/email/send.ts         ← thin Resend wrapper: send() with logging,
        │                              batching (Resend max 50/to), retry, no-throw
        │
        └─ lib/email/layout.ts       ← shared branded layout: logo, colors, footer
                                       (logo hosted at a public URL for email clients)
```

### 3.1 File-by-file plan

| File                                            | Purpose                                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/email/layout.ts`                           | Shared HTML skeleton: Trinomul logo (absolute URL), header, footer with website name + link, red/white brand palette. Every template wraps this.              |
| `lib/email/templates/blood-request-alert.ts`    | The donor alert email (Section 2.5).                                                                                                                          |
| `lib/email/templates/welcome.ts`                | Welcome email after registration ("Join the mission").                                                                                                        |
| `lib/email/templates/register-verify.ts`        | (If we add email verification later.)                                                                                                                         |
| `lib/email/templates/forgot-password.ts`        | Password reset link email, token expires 1h.                                                                                                                  |
| `lib/email/templates/password-reset-success.ts` | Confirmation after reset.                                                                                                                                     |
| `lib/email/templates/application-status.ts`     | Donor application approved (new) — extends existing rejection email into approved/rejected pair.                                                              |
| `lib/email/templates/request-confirmed.ts`      | Sent to the requester when their request is posted (tracking code + QR link).                                                                                 |
| `lib/email/templates/donor-thanks.ts`           | Optional: thank-you after a fulfilled donation.                                                                                                               |
| `lib/email/recipients.ts`                       | `selectDonorEmailRecipients(request)` → max 15 eligible donor emails with the Section 2 rules.                                                                |
| `lib/email/send.ts`                             | `sendEmail({ to, subject, html })` — no-throw, logs via existing `createLogger("email")`, graceful no-op when `RESEND_API_KEY` missing.                       |
| `lib/email/dispatch.ts`                         | `dispatchBloodRequestEmails(requestId)` — glue: load request → select recipients → render → send → record.                                                    |
| `lib/db.ts` (edit)                              | Extend `recordDonorMatches()` usage: record email-notified donors with `notification_method = 'email'` so admin panel response tracking works for emails too. |

### 3.2 Wire-up points

1. **Public blood request form** → after `serverCreateBloodRequest()` succeeds,
   fire `dispatchBloodRequestEmails(requestId)` in a background `setTimeout`
   (same pattern as the existing translation job — don't block the submit).
2. **Admin Emergency SOS** → same dispatch, `notification_method = 'email_sos'`.
3. **Forgot password** → `ForgotPasswordForm` flow: generate token, store hash +
   expiry, send email with reset link. (Needs a small `password_reset_tokens`
   table or JWT with 1h expiry — JWT is simpler, no new table.)
4. **Registration / welcome** → after account creation in `app/api/donors/route.ts`
   POST and any user sign-up path.
5. **Donor application decision** → admin panel approve/reject actions
   (reject email already exists; add approved version).

***

## 4. Email Template Design System

All templates share one layout so every email looks like Trinomul:

```
┌─────────────────────────────────────┐
│  [🔴 Trinomul logo]                 │  ← logo (public URL, e.g. /logo-email.png
│  Trinomul Blood Bank, Rangpur       │     hosted on the site or Resend CDN)
├─────────────────────────────────────┤
│                                     │
│   <service-specific content>        │  ← each template has its own accent
│                                     │
├─────────────────────────────────────┤
│  Footer: website name + link        │
│  "You received this because…"       │
│  Manage preferences / unsubscribe   │  ← donor alert emails only
└─────────────────────────────────────┘
```

**Per-service styles:**

| Service                         | Accent                        | Layout flavor                                                                                                                                               |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Blood request alert          | Red `#dc2626`, urgency banner | Card layout: giant blood group badge, patient details grid, red CTA buttons (Call / Map / Track). Critical = pulsing-style red header; normal = softer red. |
| 🔐 Forgot password              | Slate `#0f172a`               | Minimal, security-focused, big single button, 1h expiry note, "not you?" note.                                                                              |
| 🎉 Welcome                      | Emerald `#059669`             | Warm greeting, mission statement, 2–3 getting-started links.                                                                                                |
| 📝 Application approved         | Green                         | Congratulations + next steps.                                                                                                                               |
| ❌ Application rejected          | Red/amber                     | (Exists — migrate into new template system.)                                                                                                                |
| ✅ Request confirmed (requester) | Blue `#2563eb`                | Tracking code (mono font) + QR link + what happens next timeline.                                                                                           |

**Constraints for email-client compatibility:**

- Inline CSS only (no `<style>` blocks, no external CSS)

- Table-based or flex-simple layouts (Outlook-safe: tables)

- Logo from absolute `https://` URL (email clients can't load `/logo.png`)

- Bengali + English subject lines where appropriate (donor base is bilingual)

- Plain-text fallback via Resend's `text` param

***

## 5. Rate Limits & Safety

- **Resend free tier:** 100 emails/day, 3,000/month → 15-donor cap per request
  is well within limits; add a daily counter guard (Redis or simple DB counter)
  that skips alert emails when daily quota is nearly hit (leave headroom for
  password resets).

- **Never throw:** all sends wrapped in try/catch with logging (existing pattern).

- **Unsubscribe:** donor alert emails include an unsubscribe/preferences link;
  add `email_opt_in` column on `profiles` (default 1) and respect it in
  recipient selection.

- **Anti-spam:** send with `batch` API where possible; spread sends if > 10.

- **No secrets in templates**; escape all user content (`escapeHtml` exists).

***

## 6. New Environment Variables

```env
# .env.example additions
RESEND_API_KEY=            # existing
EMAIL_FROM="Trinomul Blood Bank <noreply@trinomul.org>"   # existing default
NEXT_PUBLIC_SITE_URL=https://trinomul.org                 # existing
EMAIL_LOGO_URL=https://trinomul.org/logo-email.png        # NEW — absolute URL
DAILY_EMAIL_CAP=90                                        # NEW — safety cap
```

***

## 7. Database Changes

| Change                                        | Type                          | Notes                                                                         |
| --------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `profiles.email_opt_in`                       | Column, default 1             | Donor can turn off alert emails                                               |
| `donor_matches.notification_method = 'email'` | Value                         | Reuse existing column — no schema change needed                               |
| `email_log` table (optional)                  | New table                     | `id, type, to, request_id, status, resent_id, created_at` — audit + debugging |
| Password reset                                | JWT (jose, already installed) | No new table — signed 1h token in the reset link                              |

***

## 8. Implementation Phases

### Phase 1 — Foundation (templates + send layer)

1. Create `lib/email/layout.ts` (branded skeleton with logo, footer, styles)
2. Create `lib/email/send.ts` (wrapper: no-throw, logging, daily cap guard)
3. Migrate existing rejection template into `templates/application-status.ts`
4. Add `EMAIL_LOGO_URL` + `DAILY_EMAIL_CAP` to `.env.example`

### Phase 2 — Donor alert emails (the core feature)

1. `lib/email/recipients.ts` — Section 2 targeting rules (5 km + union +
   Rangpur Sadar logic, other-upazila logic, eligibility, 15 cap)
2. `lib/email/templates/blood-request-alert.ts`
3. `lib/email/dispatch.ts` — glue + record `donor_matches` rows with
   `notification_method = 'email'` so admin response tracking covers emails
4. Wire into `serverCreateBloodRequest()` background job + admin Emergency SOS
5. Add `email_opt_in` column + respect it in selection

### Phase 3 — Auth & account emails

1. Forgot-password flow: JWT token, `templates/forgot-password.ts`,
   wire into existing `ForgotPasswordForm` server action
2. Reset-success email
3. Welcome email on registration (both donor + user paths)

### Phase 4 — Polish

1. Request-confirmed email to requester (tracking code + QR)
2. Application-approved email
3. `email_log` table (optional audit)
4. Tests: recipient-selection unit tests (5 km ring, union fallback, 3-month
   cooldown, cap 15, opt-out), template render snapshots

***

## 9. Out of Scope (future ideas)

- SMS alerts (the `notification_method` design leaves room)

- Digest emails ("weekly requests near you")

- Resend inbound (reply-to handlers)

- Localization toggle per-donor for email language (BN/EN) — start bilingual
  in one template, split later if needed

