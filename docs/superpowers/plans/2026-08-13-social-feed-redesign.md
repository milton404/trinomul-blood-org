# Social Feed Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the public feed route into a responsive Facebook-style community experience while preserving the existing post, request, engagement, moderation, and bilingual behavior.

**Architecture:** Keep `FeedList`, `FeedComposer`, and `FeedPostCard` as the feature owners for feed data and actions. Add small presentation components for the page shell, left navigation, highlights row, and right-side community action modules. The feed page composes these modules and passes only existing auth, route, and server-action data; no new database model is required.

**Tech Stack:** Next.js App Router, React 19, TypeScript, next-intl, Tailwind CSS v4, lucide-react, Zustand auth store, existing server actions, Vitest/Testing Library.

---

## File Map

### Create

- `components/social/CommunitySidebar.tsx` — desktop navigation and shortcuts with locale-aware links.
- `components/social/CommunityHighlights.tsx` — compact stories-style donation/community highlights using the existing feed response.
- `components/social/CommunityRightRail.tsx` — emergency CTA, request/discovery links, inventory/impact messaging without private data.

### Modify

- `app/[locale]/(main)/feed/page.tsx` — replace the narrow single-column wrapper with the responsive three-column page shell and compose new modules.
- `components/social/FeedList.tsx` — expose the loaded feed items to the highlights module, improve tab presentation, and keep pagination/action behavior unchanged.
- `messages/en.json` — add all new page/sidebar/highlight/impact labels.
- `messages/bn.json` — add Bengali equivalents for every new English key.

### Keep unchanged unless verification exposes a regression

- `components/social/FeedComposer.tsx` — existing creation/upload/visibility behavior remains authoritative.
- `components/social/FeedPostCard.tsx` — existing like/comment/share/edit/delete/pin behavior remains authoritative.
- `lib/db-actions.ts` — use `serverGetFeed` and existing social actions; do not add a new feed API.
- `components/requests/EmergencySOS.tsx` — use the existing request flow via a route link rather than embedding the full SOS form in the feed shell.

### Verification

- `npm run lint`
- `npx tsc --noEmit --skipLibCheck`
- `npm run test:run`
- `npm run build`

---

### Task 1: Add the left community navigation module

**Files:**
- Create: `components/social/CommunitySidebar.tsx`
- Modify: `messages/en.json`
- Modify: `messages/bn.json`

- [ ] **Step 1: Define the sidebar props and locale-aware links**

Use a small presentational component with no data fetching:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Compass, Droplets, HeartHandshake, Home, MapPinned, Users } from "lucide-react";

const LINKS = [
  { key: "feed", href: "/feed", icon: Home },
  { key: "findDonor", href: "/donors", icon: Users },
  { key: "requests", href: "/requests", icon: Droplets },
  { key: "map", href: "/map", icon: MapPinned },
  { key: "impact", href: "/leaderboard", icon: HeartHandshake },
] as const;

export default function CommunitySidebar() {
  const locale = useLocale();
  const t = useTranslations("social");

  return (
    <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
        <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {t("communityNavigation")}
        </p>
        <nav aria-label={t("communityNavigation")} className="space-y-1">
          {LINKS.map(({ key, href, icon: Icon }, index) => (
            <Link
              key={key}
              href={`/${locale}${href}`}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors ${
                index === 0
                  ? "bg-red-50 text-red-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`nav_${key}`)}
            </Link>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-white">
          <div className="mb-2 flex items-center gap-2 text-rose-300">
            <Compass className="h-4 w-4" />
            <span className="text-xs font-bold">{t("communityTipTitle")}</span>
          </div>
          <p className="text-xs leading-relaxed text-white/65">{t("communityTip")}</p>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Add matching English and Bengali keys**

Add these keys under `social` in both locale files:

```json
{
  "communityNavigation": "Community navigation",
  "nav_feed": "Community feed",
  "nav_findDonor": "Find donors",
  "nav_requests": "Blood requests",
  "nav_map": "Explore map",
  "nav_impact": "Community impact",
  "communityTipTitle": "Small actions matter",
  "communityTip": "Share a donation update or help a nearby request reach the right donor."
}
```

Use Bengali translations that preserve the same meaning and key names.

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit --skipLibCheck`

Expected: no TypeScript errors.

---

### Task 2: Add the highlights row

**Files:**
- Create: `components/social/CommunityHighlights.tsx`
- Modify: `components/social/FeedList.tsx`
- Modify: `messages/en.json`
- Modify: `messages/bn.json`

- [ ] **Step 1: Define a feed-item projection for highlights**

Create a presentational component that accepts the already loaded feed items:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowUpRight, Droplet, Megaphone, Sparkles } from "lucide-react";

type HighlightItem = {
  id: number;
  kind?: string;
  authorName?: string;
  authorRole?: string;
  postType?: string;
  content?: string;
  bloodGroup?: string;
  urgency?: string;
};

export default function CommunityHighlights({ items }: { items: HighlightItem[] }) {
  const locale = useLocale();
  const t = useTranslations("social");
  const highlights = items
    .filter((item) => item.kind === "post" || item.kind === "request")
    .slice(0, 6);

  return (
    <section aria-labelledby="community-highlights" className="rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">{t("highlightsEyebrow")}</p>
          <h2 id="community-highlights" className="mt-1 text-sm font-black text-slate-900">{t("highlightsTitle")}</h2>
        </div>
        <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" role="list">
        {highlights.length === 0 ? (
          <p className="px-1 py-4 text-xs text-slate-400">{t("noHighlights")}</p>
        ) : (
          highlights.map((item) => {
            const isRequest = item.kind === "request";
            const isAnnouncement = item.postType === "admin_announcement";
            return (
              <Link
                key={item.id}
                href={isRequest ? `/${locale}/requests` : `/${locale}/feed`}
                className="group min-w-[148px] flex-1 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-3 text-white shadow-sm transition-transform hover:-translate-y-0.5"
                role="listitem"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/12">
                    {isRequest ? <Droplet className="h-4 w-4 text-rose-300" /> : isAnnouncement ? <Megaphone className="h-4 w-4 text-amber-300" /> : <Sparkles className="h-4 w-4 text-emerald-300" />}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/45 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-4 line-clamp-2 text-xs font-bold leading-relaxed">
                  {isRequest ? `${item.bloodGroup || ""} ${t("bloodNeeded")}` : item.content || t("communityUpdate")}
                </p>
                <p className="mt-2 truncate text-[10px] text-white/55">{item.authorName || t("communityMember")}</p>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Pass the loaded items from FeedList**

Add an optional callback prop and a ref that mirrors rendered feed state:

```tsx
import { useRef } from "react";

type FeedListProps = {
  onItemsChange?: (items: any[]) => void;
};

export default function FeedList({ onItemsChange }: FeedListProps) {
  const itemsRef = useRef<any[]>([]);
```

After the feed response is resolved, derive the next array from the ref, then update both the ref and React state. This avoids stale state when the memoized loader handles load-more:

```tsx
const nextItems = replace
  ? (res.items as any[])
  : [...itemsRef.current, ...(res.items as any[])];
itemsRef.current = nextItems;
setItems(nextItems);
onItemsChange?.(nextItems);
```

When replacing the feed after a post, tab change, or refresh, the ref is replaced as well, so the highlights always match the visible feed.

- [ ] **Step 3: Add the highlight translation keys**

Add these keys in English and Bengali:

```json
{
  "highlightsEyebrow": "From the community",
  "highlightsTitle": "Today’s highlights",
  "noHighlights": "Community highlights will appear here.",
  "bloodNeeded": "blood needed",
  "communityUpdate": "A new community update",
  "communityMember": "Community member"
}
```

- [ ] **Step 4: Run the type check**

Run: `npx tsc --noEmit --skipLibCheck`

Expected: no TypeScript errors.

---

### Task 3: Add the right community rail

**Files:**
- Create: `components/social/CommunityRightRail.tsx`
- Modify: `messages/en.json`
- Modify: `messages/bn.json`

- [ ] **Step 1: Build the route-based action rail**

The rail should not create a second SOS form or invent live metrics. Use links to existing routes and safe aggregate messaging:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, HeartPulse, ShieldAlert, Trophy, UsersRound } from "lucide-react";

export default function CommunityRightRail() {
  const locale = useLocale();
  const t = useTranslations("social");

  return (
    <aside className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
      <div className="space-y-3">
        <Link href={`/${locale}/request`} className="block rounded-3xl bg-gradient-to-br from-red-600 to-rose-700 p-4 text-white shadow-lg shadow-red-600/20 transition-transform hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-3">
            <ShieldAlert className="h-5 w-5 text-red-100" />
            <ArrowRight className="h-4 w-4 text-white/70" />
          </div>
          <p className="mt-5 text-sm font-black">{t("emergencyTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/75">{t("emergencyDescription")}</p>
        </Link>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <HeartPulse className="h-4 w-4 text-rose-600" />
            <h2 className="text-sm font-black">{t("discoverTitle")}</h2>
          </div>
          <div className="mt-3 space-y-2">
            <Link href={`/${locale}/requests`} className="flex items-center justify-between rounded-2xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100">
              {t("activeRequestsLink")}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/${locale}/donors`} className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
              {t("findDonorsLink")}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/${locale}/leaderboard`} className="flex items-center justify-between rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100">
              <span className="flex items-center gap-2"><Trophy className="h-3.5 w-3.5" />{t("impactLink")}</span><ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-slate-950 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 text-emerald-300"><UsersRound className="h-4 w-4" /><h2 className="text-sm font-black">{t("impactTitle")}</h2></div>
          <p className="mt-3 text-xs leading-relaxed text-white/65">{t("impactDescription")}</p>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Add right-rail translations**

Add English and Bengali values for:

```json
{
  "emergencyTitle": "Need blood urgently?",
  "emergencyDescription": "Create a request and help nearby donors find you faster.",
  "discoverTitle": "Discover",
  "activeRequestsLink": "View blood requests",
  "findDonorsLink": "Find available donors",
  "impactLink": "See community impact",
  "impactTitle": "Together, we save lives",
  "impactDescription": "Every post, share, and donation update helps the right people connect when it matters."
}
```

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit --skipLibCheck`

Expected: no TypeScript errors.

---

### Task 4: Compose the responsive feed page shell

**Files:**
- Modify: `app/[locale]/(main)/feed/page.tsx`
- Modify: `components/social/FeedList.tsx`
- Modify: `messages/en.json`
- Modify: `messages/bn.json`

- [ ] **Step 1: Replace the single-column page with the three-column composition**

Use the existing page as the integration point:

```tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import CommunityHighlights from "@/components/social/CommunityHighlights";
import CommunityRightRail from "@/components/social/CommunityRightRail";
import CommunitySidebar from "@/components/social/CommunitySidebar";
import FeedList from "@/components/social/FeedList";

export default function FeedPage() {
  const t = useTranslations("social");
  const locale = useLocale();
  const [items, setItems] = useState<any[]>([]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#fff1f2_0,_#f8fafc_34rem,_#f8fafc_100%)]">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[220px_minmax(0,680px)] lg:gap-6 lg:py-8 xl:grid-cols-[220px_minmax(0,680px)_280px] xl:px-8">
        <CommunitySidebar />

        <section className="min-w-0">
          <header className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600">{t("title")}</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                <Users className="h-6 w-6 text-red-600 sm:h-7 sm:w-7" />
                {t("communityFeedHeading")}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">{t("subtitle")}</p>
            </div>
            <Link href={`/${locale}/request`} className="hidden shrink-0 items-center gap-1.5 rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 transition-colors hover:bg-red-700 sm:inline-flex">
              {t("requestBlood")}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          <div className="mb-4 sm:mb-5">
            <CommunityHighlights items={items} />
          </div>
          <FeedList onItemsChange={setItems} />
        </section>

        <CommunityRightRail />
      </div>
    </main>
  );
}
```

Keep the mobile emergency/request action available by adding a visible small-screen link above the feed or inside the page header:

```tsx
<Link href={`/${locale}/request`} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white sm:hidden">
  {t("requestBlood")}<ArrowRight className="h-3.5 w-3.5" />
</Link>
```

- [ ] **Step 2: Update FeedList with the item callback**

Implement the `onItemsChange` prop from Task 2 and invoke it after every successful feed load. Ensure the page highlights update after refresh, tab changes, and load-more operations.

- [ ] **Step 3: Add page-level translations**

Add these English and Bengali keys:

```json
{
  "communityFeedHeading": "Community feed",
  "requestBlood": "Request blood"
}
```

- [ ] **Step 4: Run focused checks**

Run: `npx tsc --noEmit --skipLibCheck`

Expected: no TypeScript errors.

---

### Task 5: Verify localization, behavior, and responsive presentation

**Files:**
- Modify only files needed to fix verification failures.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: exit code 0. Fix only feed-redesign lint findings; do not introduce unrelated refactors.

- [ ] **Step 2: Run TypeScript verification**

Run: `npx tsc --noEmit --skipLibCheck`

Expected: exit code 0 with no output.

- [ ] **Step 3: Run existing automated tests**

Run: `npm run test:run`

Expected: all existing tests pass. If no tests are present, record the command result and continue with build verification.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: the Next.js production build completes successfully.

- [ ] **Step 5: Verify the browser states manually**

Start the app with `npm run dev`, then inspect `/en/feed` and `/bn/feed` at desktop and mobile widths.

Verify:

- Desktop shows left navigation, central feed, and right action rail.
- Medium width hides the right rail without causing overflow.
- Mobile shows only the center feed and a visible request-blood action.
- Highlights use current loaded feed items and remain horizontally contained.
- Logged-out composer still links to login.
- Logged-in composer and existing feed actions still work.
- Request items still render as request cards.
- English and Bengali labels resolve without `MISSING_MESSAGE` errors.
- No horizontal page overflow exists at 320px viewport width.

- [ ] **Step 6: Review the final diff**

Run: `git diff -- app/[locale]/(main)/feed/page.tsx components/social/FeedList.tsx components/social/CommunitySidebar.tsx components/social/CommunityHighlights.tsx components/social/CommunityRightRail.tsx messages/en.json messages/bn.json`

Expected: only the planned social-feed presentation and translation changes are present.
