# Trinomul Blood Bank Rangpur — SEO Plan

**Site:** https://trinomul.org
**Brand:** Trinomul Blood Bank Rangpur · তৃণমূল ব্লাড ব্যাংক রংপুর
**Scope:** Rank on Google Search + Bing + DuckDuckGo for blood-bank / blood-donor queries across the Rangpur division.

---

## 1. Goals & Success Metrics

- **Top priority (transactional):** `blood bank rangpur`, `blood donor rangpur`, `রক্তদাতা রংপুর`, `emergency blood rangpur`.
- **Secondary (informational):** `how to donate blood in Bangladesh`, `blood group search`, `রক্তদান বাংলাদেশ`.
- **Local (district):** `blood donors dinajpur`, `blood donors kurigram`, etc.

Measure with **Google Search Console** (impressions, clicks, avg position, queries per locale), **Bing Webmaster Tools**, and **Google Business Profile** insights. North-star: #1–3 for "blood bank rangpur" within 3–6 months.

---

## 2. Keyword Research

### A. English (Latin script, Google-bn + Google-global)
| Group | Keywords |
|---|---|
| Brand | `trinomul blood bank`, `trinomul blood bank rangpur`, `trinomul.org` |
| Head | `blood bank rangpur`, `blood donation rangpur`, `blood donor rangpur`, `rangpur blood bank` |
| Action | `find blood donor`, `request blood online bangladesh`, `donate blood rangpur division`, `emergency blood bangladesh` |
| Long-tail | `o negative blood rangpur`, `rare blood group bangladesh`, `blood group search`, `blood donors near me rangpur` |
| Local (district) | `blood donors dinajpur`, `kurigram`, `lalmonirhat`, `nilphamari`, `gaibandha`, `thakurgaon`, `panchagarh` |

### B. Bangla (বাংলা)
| Group | Keywords |
|---|---|
| Brand | `তৃণমূল ব্লাড ব্যাংক`, `তৃণমূল ব্লাড ব্যাংক রংপুর` |
| Head | `রক্তদান রংপুর`, `ব্লাড ব্যাংক রংপুর`, `রক্তদাতা রংপুর` |
| Action | `জরুরি রক্ত`, `রক্ত দরকার`, `রক্তদাতা খুঁজুন`, `রক্তের অনুরোধ` |
| Long-tail | `রক্তের গ্রুপ`, `রক্তদান বাংলাদেশ`, `রংপুর বিভাগ রক্তদান`, `ও নেগেটিভ রক্ত রংপুর` |

### C. Banglish (Romanized Bangla — huge search volume in BD)
| Keywords |
|---|
| `blood bank rangpur`, `blood donor rangpur`, `rokto dan rangpur`, `rokto donor`, `rokto dorkar`, `emergency blood bangladesh`, `blood dan korte chai`, `trinomul blood bank`, `blood group search bangladesh` |

**How to use:** primary keyword in `<title>` + `<h1>`; support keywords in `<h2>/<h3>` and body copy; Bangla/Banglish in the `bn` locale pages and FAQ.

---

## 3. On-Page SEO (implemented in this change)

| Area | Status | Where |
|---|---|---|
| Per-locale title + template | ✅ | `app/[locale]/layout.tsx` → `generateMetadata` |
| Meta description (EN + BN) | ✅ | `lib/seo.ts` |
| Keywords (EN + BN + Banglish) | ✅ | `lib/seo.ts` |
| Canonical + hreflang (en/bn/x-default) | ✅ | `components/seo/AlternateLinks.tsx` + `app/sitemap.ts` |
| OpenGraph + Twitter cards | ✅ | `app/[locale]/layout.tsx` |
| Structured Data (Organization + WebSite + SearchAction) | ✅ | `components/seo/JsonLd.tsx` |
| Sitemap with hreflang | ✅ | `app/sitemap.ts` |
| robots.txt (host + sitemap + rules) | ✅ | `app/robots.ts` |

### Page-level titles to add (Phase 2)
The pages live as `/en/…`, `/bn/…`. Each public page should set a unique title/description. Since the current pages are **client components**, add lightweight server wrappers (or `unstable_setRequestLocale`) per page:

| Route | EN title | BN title |
|---|---|---|
| `/donors` | Find Blood Donors in Rangpur | রংপুরে রক্তদাতা খুঁজুন |
| `/requests` | Active Blood Requests — Rangpur | সক্রিয় রক্তের অনুরোধ — রংপুর |
| `/request` | Request Blood in an Emergency | জরুরি রক্তের অনুরোধ করুন |
| `/become-donor` | Become a Blood Donor | রক্তদাতা হোন |
| `/about` | About Trinomul Blood Bank | আমাদের সম্পর্কে |
| `/contact` | Contact Trinomul Blood Bank | যোগাযোগ |

---

## 4. Local SEO (Rangpur Division)

1. **Google Business Profile** (name: "Trinomul Blood Bank Rangpur", category: Blood bank / Non-profit) with NAP + geo coordinates (25.7439, 89.2752) + phone + service area = all 8 districts.
2. **District landing pages** — one page per district ("Blood donors in Dinajpur", "রক্তদাতা দিনাজপুর") using `lib/constants/rangpur.ts`; each with unique H1, donor counts, and FAQ. Add to sitemap + internal links from footer.
3. **Local citations:** list the org in BD directories, Facebook, and hospital partner pages (consistent NAP).
4. **GEO markup** in JSON-LD (already scaffolds `areaServed` + `foundingLocation`).

---

## 5. Technical SEO

- ✅ Server-rendered metadata, canonical, hreflang, sitemap, robots.
- ✅ Mobile-first / PWA (manifest + service worker already present).
- ⚠️ **Create a 1200×630 `public/og-image.png`** (currently the square logo is used for OG/Twitter).
- ⚠️ Configure **next-sitemap or crawl budget**: ensure `/en` and `/bn` both crawlable (done via robots allow).
- ⚠️ Add `next.config.ts` redirects: `www.trinomul.org → trinomul.org`, and `http→https` (Vercel handles TLS; add the host redirect).
- ⚠️ Monitor Core Web Vitals (LCP/CLS) — the map/heavy hero can delay LCP.

---

## 6. Off-Page SEO

- Facebook Page + Group posts targeting `rokto dan rangpur` / `রক্তদান রংপুর`.
- Backlinks from hospitals, universities (Rangpur), and local news ("blood donation camp").
- Encourage sharing the blood-request links (shareable card already built via OG tags).

---

## 7. Launch Checklist (before going live)

- [ ] Point **trinomul.org** DNS (A/CNAME) to the Vercel project + add `www` + enforce HTTPS.
- [ ] Set `NEXT_PUBLIC_SITE_URL=https://trinomul.org` in Vercel env (and `.env` locally).
- [ ] Submit `https://trinomul.org/sitemap.xml` to Google Search Console and Bing Webmaster Tools.
- [ ] Verify `robots.txt`, canonical, and hreflang via GSC URL Inspection.
- [ ] Create Google Business Profile + add schema-fill fields.
- [ ] Create `og-image.png` (1200×630).
- [ ] Add page-level titles/descriptions (Phase 2) and district landing pages.