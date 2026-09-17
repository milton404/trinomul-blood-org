make a plan ,, md file our app currect phone features has lack need update according to our web app features and this one:

You are a senior React Native + Expo + TypeScript mobile engineer.

I have an existing production web application called:

TRINOMUL BLOOD BANK

Website:
https://trinomul.vercel.app/bn

Production web frontend:
Next.js + TypeScript
Hosted on Vercel

Backend:
Supabase
- PostgreSQL database
- Supabase Auth
- Supabase Storage where applicable
- Supabase Realtime where applicable
- Existing database schema
- Existing security policies
- Existing application data

IMPORTANT:

We are NOT creating a new backend.

We are NOT creating a second database.

We are NOT copying the existing database.

We are NOT replacing the existing web application.

We are creating a native mobile client for the existing Trinomul Blood Bank system.

The mobile application must connect to the SAME Supabase project/database used by the existing web application.

The mobile app must coexist safely with the existing web application without breaking anything.

==================================================
1. PRIMARY OBJECTIVE
==================================================

Build a production-quality cross-platform mobile application for:

Android
iOS

using:

- React Native
- Expo
- TypeScript
- Expo Router
- Supabase
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage if already used
- Supabase Realtime where useful
- Expo Location
- Expo Notifications
- Expo SecureStore
- React Native compatible UI components
- React Native compatible map solution

Use the CURRENT stable Expo SDK available when development begins.

At the time of writing, Expo documentation is based around SDK 57.

DO NOT blindly hardcode an old Expo version.

First verify the currently supported stable Expo SDK and compatible Expo Go version from official Expo documentation.

Use Expo Go during development.

Use EAS Build for production Android/iOS builds.

==================================================
2. EXISTING WEB APPLICATION
==================================================

Before writing mobile code, inspect the existing web application architecture if source code is available.

Understand:

- authentication
- user roles
- donor profiles
- blood groups
- donor availability
- blood requests
- hospitals
- locations
- donor search
- AI search
- notification system
- donation history
- admin functionality
- database schema
- Supabase tables
- relationships
- database functions
- RPCs
- Edge Functions
- Storage buckets
- Realtime subscriptions
- existing API routes
- existing security policies
- existing environment variables
- existing validation
- existing business rules

DO NOT assume table names.

DO NOT invent table names.

DO NOT create duplicate tables.

DO NOT modify existing database structure unless absolutely necessary and explicitly justified.

The mobile application must adapt to the existing backend.

==================================================
3. VERY IMPORTANT BACKEND RULE
==================================================

The mobile application should connect directly to Supabase using the official Supabase JavaScript client where appropriate.

Architecture:

Mobile App
    |
    | HTTPS / Supabase SDK
    v
Supabase
    |
    +-- Auth
    +-- PostgreSQL
    +-- Storage
    +-- Realtime
    +-- Edge Functions
    |
    v
Existing Trinomul Web App

The Vercel frontend URL is NOT the mobile application's backend.

Do NOT scrape the website.

Do NOT call website pages as APIs.

Do NOT duplicate the backend.

If the existing web application has secure server-side operations that cannot safely be performed from the mobile client, reuse/create appropriate Supabase Edge Functions or existing server APIs.

Never expose server secrets to the mobile application.

==================================================
4. SECURITY
==================================================

Security is extremely important because this is a blood-bank application.

NEVER put these in the mobile application:

- Supabase service_role key
- database password
- private API keys
- server secrets
- admin secrets
- private encryption keys

Only use the Supabase publishable/anon client key intended for client applications.

Use:

EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

or the current recommended Supabase environment-variable naming convention.

Use environment variables.

Never hardcode secrets.

Use Supabase Auth for authentication.

Respect existing Row Level Security policies.

Do not bypass RLS from the mobile app.

Never use service_role from React Native.

If RLS is currently insufficient, identify the exact problem and propose a safe database-policy fix rather than bypassing security.

==================================================
5. AUTHENTICATION
==================================================

The mobile app must support the authentication system already used by Trinomul.

First inspect the existing web authentication implementation.

Support existing authentication methods where applicable.

Potential methods:

- Email/password
- Google
- Apple on iOS where appropriate
- Password reset
- Session persistence
- Logout
- Session restoration

Do NOT implement an authentication system that conflicts with the existing Supabase Auth system.

Use secure mobile session persistence.

Use:

expo-secure-store

where appropriate for sensitive session/token storage.

Implement:

Splash/loading state
    ↓
Restore Supabase session
    ↓
Authenticated?
    ├── YES → Main application
    └── NO → Authentication screens

Handle:

- expired sessions
- invalid sessions
- logout
- network failure
- OAuth cancellation
- authentication errors

For Google/Apple OAuth, implement proper mobile deep linking/redirect handling.

Do not use fake OAuth flows.

==================================================
6. USER TYPES
==================================================

The mobile app should respect the roles already present in the web application.

Possible users:

1. Donor
2. Patient / Blood Requester
3. Hospital
4. Admin

DO NOT assume these exact roles exist.

Inspect the current Supabase schema and web application.

The mobile UI must be role-aware.

Users should only see functionality they are authorized to access.

Admin functionality should NOT automatically be exposed in the public mobile application.

==================================================
7. MAIN MOBILE NAVIGATION
==================================================

Use Expo Router.

Recommended high-level navigation:

(app)/
    _layout.tsx

    (tabs)/
        index.tsx
        search.tsx
        requests.tsx
        notifications.tsx
        profile.tsx

    donor/
        availability.tsx
        history.tsx
        profile.tsx

    request/
        create.tsx
        details.tsx

    donor-search/
        index.tsx
        details.tsx

    hospital/
        index.tsx

    settings/
        index.tsx

    auth/
        login.tsx
        register.tsx
        forgot-password.tsx

Adapt this structure to the actual application requirements.

Do not create unnecessary screens.

==================================================
8. HOME SCREEN
==================================================

Create a mobile-first dashboard.

The home screen should provide quick access to:

- Find blood donors
- Search by blood group
- Find nearby donors
- Create blood request
- View active requests
- Donation status
- Donor availability
- Notifications
- Profile

Display important information from the real Supabase database.

Do not use fake placeholder data in the finished application.

==================================================
9. BLOOD DONOR SEARCH
==================================================

This is one of the most important features.

Users should be able to find available blood donors.

Search/filter by:

- Blood group
- Location
- Distance
- Availability
- Name if permitted
- Area
- Union
- Upazila
- District
- Division

Use the existing database/search logic from the web application.

Do not duplicate business logic unnecessarily.

If the web application already has a Supabase RPC/function for donor search, reuse it.

If it has a server-side API/Edge Function, reuse it where appropriate.

Only show donors that the existing business rules define as available.

Never expose sensitive donor information unnecessarily.

==================================================
10. LOCATION
==================================================

Use Expo Location.

Request location permission only when needed.

Do not request location immediately on first app launch unless necessary.

Explain why location is needed.

Possible flow:

User taps:
"Find nearby donors"

↓

Ask for location permission

↓

Get current coordinates

↓

Search nearby eligible donors

↓

Display results

Handle:

- permission denied
- location services disabled
- timeout
- inaccurate location
- user manually selecting a location

Do not continuously track the user's location unless the existing product explicitly requires it.

Avoid unnecessary background location.

==================================================
11. MAP
==================================================

The existing web application uses/targets location-based donor discovery.

Create a mobile map experience.

Preferred architecture:

React Native compatible MapLibre / native map solution depending on current Expo compatibility.

Before implementing, verify the latest Expo-compatible map library.

The map should support:

- user location
- donor markers
- blood group information
- donor availability
- distance
- selected donor
- map zoom
- search location
- manually selected location

Do not expose exact sensitive donor coordinates if that creates a privacy risk.

If the existing backend stores precise donor coordinates, apply appropriate privacy rules.

==================================================
12. BLOOD REQUEST
==================================================

Users should be able to create a blood request using the same business rules as the web app.

Possible fields:

- Blood group
- Required quantity
- Patient name
- Hospital
- Location
- Required date
- Urgency
- Contact information
- Additional information

BUT:

DO NOT invent fields.

Inspect the existing web application's actual request form and database schema.

Mobile request creation must match the existing backend.

Validate all fields before submission.

Show clear success/error states.

Prevent accidental duplicate submissions.

==================================================
13. BLOOD REQUEST DETAILS
==================================================

Create a request details screen.

Display appropriate information such as:

- blood group
- request status
- hospital
- location
- urgency
- requester
- required date
- created date
- matched donors if permitted
- response status
- contact options if permitted

Respect user privacy and authorization.

==================================================
14. DONOR AVAILABILITY
==================================================

Donors should be able to manage availability if this feature already exists in the web application.

Example:

AVAILABLE
NOT AVAILABLE

Use the existing database field/business logic.

When availability changes:

1. Validate authentication
2. Update Supabase
3. Confirm success
4. Refresh UI
5. Handle realtime updates where appropriate

Do not create a second availability system.

==================================================
15. DONATION HISTORY
==================================================

The web application records donation history after a donor donates blood.

The mobile application must display the same donation history.

Possible information:

- donation date
- blood group
- hospital
- request
- status

Only show data the authenticated user is authorized to see.

Do not allow donors to falsely mark themselves as having donated unless the existing system explicitly allows that.

Follow the existing web application's workflow.

==================================================
16. NOTIFICATIONS
==================================================

The existing system may send:

- SMS
- Email

The mobile application should additionally support:

- Push notifications

Potential events:

- New matching blood request
- Blood request update
- Donor availability update
- Donation status update
- Important system notification

Use Expo Notifications.

Do NOT send push notifications directly from the client.

Use a secure backend/Edge Function/server-side mechanism for push notification delivery.

Store device push tokens securely according to the existing architecture.

Do not expose notification credentials in the mobile app.

The existing email/SMS system must continue working.

Mobile push notifications are an additional channel, not a replacement.

==================================================
17. REALTIME
==================================================

If the existing application uses Supabase Realtime, reuse it where useful.

Potential realtime features:

- blood request status
- donor availability
- new blood requests
- notifications
- donation updates

Do not create unnecessary realtime subscriptions.

Always unsubscribe when screens/components unmount.

Avoid memory leaks.

==================================================
18. AI SEARCH
==================================================

The existing Trinomul application supports AI/search functionality.

Inspect exactly how the current AI search works.

If AI search uses:

- API routes
- Edge Functions
- external AI APIs
- database functions

reuse the existing secure architecture.

NEVER expose:

- DeepSeek/OpenAI/etc. secret API keys
- server credentials

inside React Native.

The mobile app should call a secure backend endpoint/function.

The AI should NOT invent donor availability.

For blood availability questions, the AI must use real database data.

If no donor is found, clearly say no matching donor was found.

Do not hallucinate names, blood groups, hospitals, or availability.

==================================================
19. PROFILE
==================================================

Create a mobile profile section.

Depending on user role, allow appropriate management of:

- name
- profile photo
- blood group
- location
- contact information
- donor status
- availability
- account information

Do not allow changing sensitive fields if the web application restricts them.

Use the existing database structure.

==================================================
20. PROFILE PHOTO / STORAGE
==================================================

If the existing web application uses Supabase Storage:

reuse the existing bucket and storage architecture.

Do not create duplicate buckets unless necessary.

For uploads:

- validate file type
- validate size
- compress/resize when appropriate
- upload securely
- handle upload failures
- avoid exposing private files publicly

Use signed URLs when required.

==================================================
21. DESIGN
==================================================

The mobile app should feel like a professional healthcare/community blood-bank application.

Design principles:

- clean
- modern
- accessible
- trustworthy
- simple
- fast
- mobile-first
- minimal animations
- no excessive bouncing
- no unnecessary gradients
- no excessive glassmorphism
- no visual clutter

Use the existing Trinomul branding.

Existing brand identity includes:

- Trinomul
- blood donation
- green/red visual identity
- humanitarian/community focus

Do not completely redesign the brand unless necessary.

Use consistent:

- typography
- spacing
- buttons
- cards
- icons
- colors
- status indicators

Support:

- light mode
- dark mode

if practical and compatible with the existing design.

==================================================
22. ACCESSIBILITY
==================================================

Implement mobile accessibility.

Ensure:

- readable font sizes
- sufficient contrast
- accessible touch targets
- screen reader labels
- meaningful button labels
- accessible form inputs
- keyboard handling
- proper error messages

Do not use color alone to communicate important status.

==================================================
23. OFFLINE / NETWORK HANDLING
==================================================

The app must gracefully handle poor internet connections.

Implement:

- loading states
- retry
- timeout handling
- offline detection
- empty states
- error states
- refresh controls

Do NOT pretend that database actions succeeded when offline.

For critical blood requests:

show clear confirmation only after successful backend response.

Consider lightweight local caching for read-only data where appropriate.

Do not introduce a complex offline database unless there is a real requirement.

==================================================
24. PERFORMANCE
==================================================

Optimize for low/mid-range Android devices.

Avoid:

- unnecessary rerenders
- huge lists rendered all at once
- large images
- excessive network requests
- repeated database queries
- unnecessary realtime subscriptions

Use:

- FlatList / FlashList if appropriate
- pagination
- debounced search
- memoization where useful
- image optimization
- query caching if appropriate

Do not prematurely over-engineer.

==================================================
25. DATABASE ACCESS
==================================================

Create a dedicated Supabase client:

lib/
    supabase.ts

Use the official Supabase JavaScript client.

Keep database queries organized.

Example structure:

src/
    lib/
        supabase.ts

    services/
        auth.ts
        donors.ts
        bloodRequests.ts
        notifications.ts
        profile.ts
        donations.ts

    hooks/
        useAuth.ts
        useDonors.ts
        useBloodRequests.ts
        useNotifications.ts

    types/
        database.ts

Do not put all Supabase queries directly inside UI components.

==================================================
26. TYPESCRIPT
==================================================

Use strict TypeScript.

Avoid:

any

unless absolutely necessary.

Prefer generated Supabase database types.

If possible:

Generate database types directly from the existing Supabase schema.

Use those types throughout the mobile application.

Database changes must not silently break TypeScript.

==================================================
27. ENVIRONMENT VARIABLES
==================================================

Use:

.env

.env.example

Never commit:

.env

to Git.

Example:

EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

Only public client configuration belongs in EXPO_PUBLIC variables.

NEVER place:

service_role
database passwords
private API keys
AI secret keys

inside EXPO_PUBLIC variables.

==================================================
28. PROJECT STRUCTURE
==================================================

Use a scalable architecture similar to:

trinomul-mobile/

├── app/
│   ├── _layout.tsx
│   │
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   │
│   ├── (app)/
│   │   ├── _layout.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── search.tsx
│   │   │   ├── requests.tsx
│   │   │   ├── notifications.tsx
│   │   │   └── profile.tsx
│   │   │
│   │   ├── donors/
│   │   ├── requests/
│   │   ├── donations/
│   │   ├── notifications/
│   │   ├── profile/
│   │   └── settings/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── donors/
│   ├── requests/
│   ├── maps/
│   └── notifications/
│
├── lib/
│   ├── supabase.ts
│   ├── storage.ts
│   └── constants.ts
│
├── services/
│   ├── auth.ts
│   ├── donors.ts
│   ├── requests.ts
│   ├── donations.ts
│   ├── notifications.ts
│   └── profile.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useDonors.ts
│   ├── useRequests.ts
│   └── useNotifications.ts
│
├── types/
│   └── database.ts
│
├── utils/
│
├── assets/
│
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md

Adapt this structure if the actual application requires something different.

Do not create meaningless folders.

==================================================
29. DO NOT BREAK THE WEB APPLICATION
==================================================

CRITICAL:

The existing web application is already working.

The mobile project must be isolated from the web frontend code unless we intentionally create a shared package.

DO NOT:

- replace Next.js
- replace Vercel
- change web routing
- delete web APIs
- change existing database tables unnecessarily
- modify production data
- remove existing authentication
- break existing users
- change production environment variables

The mobile application is an additional client.

==================================================
30. DATABASE MIGRATIONS
==================================================

Before changing the database:

inspect the existing schema.

If a new table is genuinely required, explain:

WHY
WHAT DATA IT STORES
WHY EXISTING TABLES CANNOT HANDLE IT
SECURITY/RLS REQUIREMENTS
MIGRATION PLAN
ROLLBACK PLAN

Do not automatically execute destructive SQL.

Never:

DROP TABLE
DROP COLUMN
DELETE PRODUCTION DATA

without explicit authorization.

==================================================
31. API / BACKEND RULES
==================================================

Prefer:

Mobile → Supabase

when the operation is safe for a client application.

Use:

Mobile → Supabase Edge Function/API → external service

when secrets or privileged operations are required.

Examples:

AI API
SMS provider
email provider
push notification server logic
admin operations
secure third-party integrations

Never:

Mobile → external secret API directly.

==================================================
32. PUSH NOTIFICATION ARCHITECTURE
==================================================

Recommended architecture:

Mobile App
    |
    | register Expo push token
    v
Supabase
    |
    | store token securely
    v
Edge Function / secure backend
    |
    v
Expo Push Notification Service
    |
    v
Android / iOS device

Implement:

- permission request
- token registration
- token refresh handling
- logout cleanup
- notification tap handling
- deep link to relevant request/details screen
- foreground notification behavior
- background notification behavior

==================================================
33. DEEP LINKING
==================================================

Configure deep linking for:

- password reset
- OAuth
- notification navigation
- request details
- donor details where appropriate

Example conceptual routes:

trinomul://request/123
trinomul://donor/123
trinomul://notifications

Use the actual app scheme:

trinomul

Configure correctly in Expo.

==================================================
34. FORM VALIDATION
==================================================

Use a robust validation approach.

Prefer:

React Hook Form
+
Zod

if compatible with the project.

Validate:

- required fields
- email
- phone
- blood group
- quantity
- dates
- location
- text length

Never trust client-side validation alone.

Backend/database validation/security remains authoritative.

==================================================
35. ERROR HANDLING
==================================================

Create consistent error handling.

Possible states:

Loading
Success
Empty
Offline
Unauthorized
Forbidden
Validation error
Database error
Network error
Unknown error

Never show raw database errors to users if they contain technical information.

Log useful developer information safely.

Do not log:

- passwords
- access tokens
- service keys
- private personal data

==================================================
36. PRIVACY
==================================================

This is a blood donation application.

Treat user data as sensitive.

Only expose the minimum information necessary.

Do not expose:

- unnecessary phone numbers
- exact private locations
- private medical information
- internal IDs
- authentication data

unless required and authorized.

Follow existing privacy/business rules from the web application.

==================================================
37. SECURITY AUDIT
==================================================

Before production release, perform a security review covering:

- Supabase RLS
- authentication
- authorization
- storage policies
- deep links
- OAuth redirects
- API secrets
- environment variables
- push notification tokens
- database access
- donor privacy
- request privacy
- admin access
- input validation
- injection risks
- insecure direct object references
- sensitive logging
- session handling

Do not claim the app is secure without actually checking these areas.

==================================================
38. TESTING
==================================================

Test Android and iOS.

Test:

AUTH

- registration
- login
- logout
- password reset
- Google login
- Apple login if implemented
- session restoration

DONOR

- donor profile
- blood group
- availability
- search
- location
- donation history

REQUEST

- create request
- validation
- request details
- status updates
- duplicate prevention

NOTIFICATIONS

- permission
- token registration
- foreground
- background
- notification tap
- deep linking

MAP

- permission
- current location
- donor markers
- search
- denied permissions

NETWORK

- offline
- slow connection
- retry
- timeout

SECURITY

- unauthorized access
- wrong user access
- protected routes
- storage access
- RLS

==================================================
39. TESTING DEVICES
==================================================

Test at minimum:

Android:
- modern Android phone
- lower/mid-range Android phone

iOS:
- recent iPhone
- smaller screen iPhone if possible

Test:

- portrait orientation
- different screen sizes
- dark/light mode
- keyboard behavior
- safe areas
- status bar
- navigation gestures

==================================================
40. EXPO GO DEVELOPMENT
==================================================

During development:

Use Expo Go whenever the required functionality is supported.

Use:

npx expo start

Then test through:

Android Expo Go
iOS Expo Go

If a feature requires native configuration that Expo Go cannot support, do not force it.

Clearly identify when a Development Build is required.

Use EAS Development Build when necessary.

==================================================
41. PRODUCTION BUILD
==================================================

Production should use:

EAS Build

Create:

eas.json

with development
preview
production

profiles where appropriate.

Android:

Build AAB for Google Play.

iOS:

Build through EAS for App Store/TestFlight.

Configure:

- package name
- bundle identifier
- app icon
- splash screen
- version
- build number
- permissions
- notification configuration
- deep linking
- privacy descriptions
- location permission descriptions

==================================================
42. APP IDENTIFIERS
==================================================

Use something like:

Android package:
org.trinomul.bloodbank

iOS bundle identifier:
org.trinomul.bloodbank

BUT first verify whether the organization already owns/uses a package identifier.

Do not accidentally use another company's identifier.

==================================================
43. APP ICON
==================================================

Use the official Trinomul Blood Bank branding.

Prepare:

- app icon
- adaptive Android icon
- iOS icon
- splash screen

Ensure icons meet current Expo/App Store/Google Play requirements.

Do not use a random placeholder icon for production.

==================================================
44. APP STORE REQUIREMENTS
==================================================

Prepare production requirements for:

Google Play Store
Apple App Store

Including:

- app name
- short description
- full description
- screenshots
- privacy policy
- support URL
- marketing URL if needed
- category
- age rating
- content declarations
- data safety information
- permissions justification
- account deletion requirements if applicable

Do not claim medical functionality beyond what the application actually provides.

The app is a blood donation coordination/search platform, not a medical diagnosis system.

==================================================
45. LOCATION PERMISSIONS
==================================================

Do not request:

background location

unless the product explicitly requires it.

Prefer:

foreground location

for:

"Find nearby donors"

Explain permission usage clearly.

Configure:

Android location permission
iOS location usage description

according to current Expo requirements.

==================================================
46. NOTIFICATION PERMISSIONS
==================================================

Ask for notification permission at a meaningful moment.

Do not immediately ask users on first launch without context.

Example:

"Get notified when a blood request matches your blood group."

Then request permission.

Handle denial gracefully.

==================================================
47. APP STATE
==================================================

Handle:

- active
- background
- inactive
- session expiration
- network reconnect
- notification tap
- deep link

Avoid unnecessary database refreshes every time the app opens.

Use sensible cache/revalidation behavior.

==================================================
48. MOBILE UI COMPONENTS
==================================================

Build reusable components:

Button
Input
Select
BloodGroupBadge
DonorCard
RequestCard
StatusBadge
EmptyState
ErrorState
LoadingState
SearchBar
LocationSelector
MapMarker
NotificationCard
ProfileHeader
ConfirmDialog
BottomSheet

Do not duplicate UI code across screens.

==================================================
49. BLOOD GROUP UI
==================================================

Support the exact blood groups already used by the backend.

Do not hardcode a different list.

If the backend supports:

A+
A-
B+
B-
AB+
AB-
O+
O-

use those.

But verify against the actual database/business rules first.

==================================================
50. INTERNATIONALIZATION
==================================================

The existing Trinomul application supports:

Bangla
English

The mobile app should support both.

Default language may follow the existing application's behavior.

All user-facing text should be centralized.

Example:

locales/
    en.ts
    bn.ts

Do not scatter hardcoded UI strings throughout the code.

Make it easy to add more languages later.

==================================================
51. BANGLA SUPPORT
==================================================

Ensure Bangla renders correctly.

Use fonts that support Bangla properly.

Check:

- text wrapping
- line height
- button sizing
- card heights
- accessibility
- mixed Bangla/English text

Do not use fonts that break Bangla glyph rendering.

==================================================
52. DATA FETCHING
==================================================

Do not fetch the entire donor database to the phone.

This is extremely important.

Use:

server-side filtering
pagination
RPCs
database queries
location-based queries

where appropriate.

Example:

BAD:

download 10,000 donors
→ filter on phone

GOOD:

Supabase query/RPC
→ return only matching nearby available donors

==================================================
53. SEARCH DEBOUNCING
==================================================

For text search:

debounce requests.

Do not send a Supabase query on every keystroke.

Example:

user types:

"Dhaka"

Do not send:

D
Dh
Dha
Dhab
Dhaka

Instead debounce approximately 250–500ms depending on UX.

==================================================
54. PAGINATION
==================================================

Large lists must be paginated.

Use:

- limit
- range
- cursor pagination

depending on the existing backend.

Do not load all donors/requests at once.

==================================================
55. DATABASE QUERY OPTIMIZATION
==================================================

Before release inspect:

- indexes
- expensive queries
- RPC performance
- location queries
- search queries

Do not solve slow queries by simply downloading more data to the client.

==================================================
56. REALTIME CLEANUP
==================================================

Every realtime subscription must have proper cleanup.

Example conceptual pattern:

subscribe
↓
screen active
↓
unsubscribe when leaving/unmounting

Prevent:

- duplicated subscriptions
- memory leaks
- repeated notifications
- multiple realtime events

==================================================
57. LOGGING
==================================================

Development logs are allowed.

Production logs must be safe.

Never log:

passwords
tokens
session secrets
service role keys
full private user records

Use a proper error monitoring strategy if introduced.

==================================================
58. NO MOCK DATA IN PRODUCTION
==================================================

Mock data can be used temporarily during UI development.

But before production:

REMOVE ALL MOCK DATA.

Every production screen must use real Supabase/backend data.

No fake:

donors
requests
notifications
blood availability
locations

==================================================
59. NO FAKE API
==================================================

Do not create fake local API endpoints.

The mobile app must integrate with the actual Trinomul backend.

If something is missing from the backend, stop and clearly identify what backend capability is required.

Do not invent an incompatible schema.

==================================================
60. DEVELOPMENT WORKFLOW
==================================================

Follow this order:

PHASE 1
Inspect existing web application.

PHASE 2
Inspect Supabase schema and backend.

PHASE 3
Create mobile architecture.

PHASE 4
Configure Expo.

PHASE 5
Configure Supabase.

PHASE 6
Implement authentication.

PHASE 7
Implement navigation.

PHASE 8
Implement profile.

PHASE 9
Implement donor search.

PHASE 10
Implement location/map.

PHASE 11
Implement blood requests.

PHASE 12
Implement donation history.

PHASE 13
Implement notifications.

PHASE 14
Implement realtime where required.

PHASE 15
Implement AI functionality if applicable.

PHASE 16
Testing.

PHASE 17
Security audit.

PHASE 18
Performance optimization.

PHASE 19
EAS configuration.

PHASE 20
Android production build.

PHASE 21
iOS production build.

==================================================
61. IMPORTANT CODING RULE
==================================================

DO NOT immediately start generating hundreds of files.

First inspect the existing project.

Then produce:

1. Existing architecture summary
2. Existing database/schema summary
3. Existing authentication summary
4. Existing API/backend summary
5. Mobile architecture proposal
6. Required backend changes
7. Required dependencies
8. Screen list
9. Security considerations
10. Implementation plan

Then implement incrementally.

==================================================
62. WHEN SOMETHING IS UNCLEAR
==================================================

Never guess critical backend behavior.

If you cannot determine:

- table name
- column name
- relationship
- authentication behavior
- role
- RLS rule
- API endpoint
- existing business logic

inspect the source/database first.

If still impossible, clearly identify the missing information.

Do NOT invent it.

==================================================
63. DATABASE SAFETY
==================================================

Treat the existing Supabase production database as production.

Before any SQL change:

inspect first.

Do not execute destructive SQL.

Do not reset the database.

Do not drop tables.

Do not remove policies.

Do not modify production data during development.

==================================================
64. CODE QUALITY
==================================================

Production-quality code only.

Use:

- TypeScript strict mode
- reusable components
- service layer
- hooks
- clean navigation
- typed Supabase queries
- error boundaries where appropriate
- proper loading states
- proper empty states
- proper error states

Avoid:

- giant components
- duplicated logic
- hardcoded secrets
- hardcoded user IDs
- hardcoded donor data
- hardcoded production URLs where configuration should be used
- any
- unnecessary dependencies

==================================================
65. FINAL VALIDATION
==================================================

Before declaring the project complete, run:

TypeScript check
Lint
Tests
Expo diagnostics
Production build validation

Verify:

npx tsc --noEmit

and the appropriate Expo/EAS validation commands for the current SDK.

Fix all blocking errors.

Do not say "production ready" if there are known errors.

==================================================
66. FINAL DELIVERABLE
==================================================

The final mobile project should contain:

- complete Expo React Native app
- TypeScript
- Expo Router
- Supabase integration
- authentication
- donor search
- blood requests
- location
- map
- donor availability
- donation history
- notifications
- push notifications where implemented
- profile
- role-based UI
- Bangla/English support
- reusable components
- error handling
- loading states
- security
- environment configuration
- EAS configuration
- Android configuration
- iOS configuration
- README
- setup instructions

==================================================
67. README REQUIREMENTS
==================================================

Create a complete README containing:

1. Project overview
2. Requirements
3. Node.js version
4. Expo version
5. Installation
6. Environment variables
7. Supabase setup
8. Expo Go development
9. Android development
10. iOS development
11. OAuth configuration
12. Push notification configuration
13. Location configuration
14. EAS setup
15. Android production build
16. iOS production build
17. App Store deployment
18. Google Play deployment
19. Troubleshooting
20. Security notes

==================================================
68. FINAL PRINCIPLE
==================================================

The most important architecture decision is:

ONE BACKEND
ONE DATABASE
ONE SOURCE OF TRUTH

Existing Trinomul Web App
        |
        |
        +------------------+
        |                  |
        v                  v
     Vercel             Supabase
        |                  |
        |                  |
        |          PostgreSQL/Auth/
        |          Storage/Realtime/
        |          Edge Functions
        |                  |
        +--------+---------+
                 |
                 v
          Expo Mobile App
             Android
                +
              iOS

The mobile app is another client of the existing Trinomul system.

Do not create a separate mobile database.

Do not duplicate users.

Do not duplicate donors.

Do not duplicate blood requests.

Do not duplicate authentication.

Do not duplicate business logic unnecessarily.

Everything important must remain synchronized through the existing backend.

==================================================
START NOW
==================================================

First inspect the existing Trinomul Blood Bank project and backend.

DO NOT start coding immediately.

First give me:

A. Existing web architecture
B. Existing Supabase architecture
C. Existing database tables/relationships you can verify
D. Existing authentication
E. Existing donor functionality
F. Existing blood-request functionality
G. Existing notification system
H. Existing location/map functionality
I. Existing AI functionality
J. Existing roles/permissions
K. What can be directly reused
L. What mobile-specific functionality is required
M. Any backend changes required
N. Complete mobile screen map
O. Required packages
P. Security risks
Q. Development phases

Only after this analysis should implementation begin.

Do not guess missing information.
Do not break existing functionality.
Do not create duplicate backend systems.
Use current official Expo and Supabase documentation when dependency/API decisions are required.