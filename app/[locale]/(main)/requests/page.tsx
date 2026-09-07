'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import RequestCard from '@/components/requests/RequestCard';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import MapToggle, { MapViewMode } from '@/components/map/MapToggle';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Plus, Loader2, X, Droplet, AlertTriangle,
  MapPin, Calendar, Tag, UserCheck,
  Activity, Sparkles, Navigation,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import {
  serverGetBloodRequestById,
  serverGetBloodRequestByTrackingCode,
} from '@/lib/db-actions';
import { fetchRequestsData, fetchDonorsData } from '@/lib/public-reads';
import { serverParseSearchQuery } from '@/lib/ai/search-parser';
import { RANGPUR_DISTRICTS, RANGPUR_UPAZILAS } from '@/lib/constants/rangpur';
import { useUserLocation, haversineKm } from '@/hooks/use-user-location';
import AiThinkingBadge from '@/components/common/AiThinkingBadge';
import { forwardGeocode } from '@/lib/forward-geocode';
import type { DataFilter } from '@/components/map/DataFilterToggle';
import type { BloodGroup } from '@/lib/blood-group-parser';

// AI smart-search match card
interface AIMatch {
  type: 'bloodGroup' | 'district' | 'status' | 'urgency' | 'tag' | 'assignee' | 'dateRange';
  original: string;   // what user typed
  corrected: string;  // canonical value
  label: string;      // display label
  value: string;      // filter value
}

// ── Fuzzy matching utils ──
function levenshtein(a: string, b: string): number {
  const al = a.length, bl = b.length;
  if (al === 0) return bl; if (bl === 0) return al;
  const dp: number[][] = [];
  for (let i = 0; i <= al; i++) { dp[i] = [i]; }
  for (let j = 0; j <= bl; j++) { dp[0][j] = j; }
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[al][bl];
}

function fuzzyBest(
  token: string,
  candidates: readonly string[],
  maxDist: number,
): string | null {
  const t = token.toLowerCase();
  // 1) exact (case-insensitive) match
  for (const c of candidates) { if (c.toLowerCase() === t) return c; }
  // 2) starts-with (prefix) match — good for partial typing like "rang"→"Rangpur"
  let prefixBest: string | null = null;
  for (const c of candidates) {
    if (c.toLowerCase().startsWith(t) && t.length >= 3) {
      if (!prefixBest || c.length < prefixBest.length) prefixBest = c;
    }
  }
  if (prefixBest) return prefixBest;
  // 3) subsequence check: does token's chars appear in-order inside candidate? (e.g. "crticl"→"critical", "lrpu"→"Lalmonirhat")
  for (const c of candidates) {
    const cl = c.toLowerCase();
    let ti = 0;
    for (let ci = 0; ci < cl.length && ti < t.length; ci++) {
      if (cl[ci] === t[ti]) ti++;
    }
    if (ti === t.length && t.length >= 4) return c; // all chars consumed = subsequence match
  }
  // 4) fuzzy Levenshtein
  const tLen = t.length;
  const dynMax = tLen <= 2 ? 1 : tLen <= 4 ? 2 : 3;
  const dist = Math.min(maxDist, dynMax);
  let best: { word: string; d: number } | null = null;
  for (const c of candidates) {
    const d = levenshtein(t, c.toLowerCase());
    if (d <= dist && (!best || d < best.d)) { best = { word: c, d }; }
  }
  return best ? best.word : null;
}

// ── AI dictionary ──
// Normalise common blood-group typos before fuzzy matching
const BLOOD_NORMALIZE: Record<string, string> = {
  '0+': 'O+', '0-': 'O-', 'o+': 'O+', 'o-': 'O-',
};

const AI_DICT_URGENCY = ['critical', 'urgent', 'normal'] as const;
const AI_DICT_STATUS  = ['active', 'fulfilled', 'expired', 'cancelled'] as const;
const AI_DICT_ASSIGN  = ['assigned', 'unassigned'] as const;

const TAG_NATURAL_MAP: Record<string, string> = {
  now: 'Needed Now', today: 'Today', tomorrow: 'Tomorrow',
  day_after: 'Day After', specific_date: 'Scheduled',
};

// ═══════ Bangla / Banglish normalisation maps ═══════
// Each maps a Banglish/Bangla token → canonical English value.
// The normalisation step runs BEFORE the existing English fuzzy matcher,
// so a user can type "জরুরি ও+ রংপুর" and get the same result as "urgent O+ Rangpur".

type NormaliseEntry = { triggers: string[]; to: string };
const ascii = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[''']/g, '\'');

// ── Blood groups (Bangla script full-width letters) ──
const BG_BANGLA: NormaliseEntry[] = [
  { triggers: ['এ+', 'এ-'], to: 'A+' }, // fix: এ+→A+, এ-→A+ then differentiated below
  { triggers: ['বি+', 'বি-'], to: 'B+' },
  { triggers: ['এবি+', 'এবি-', 'এ বি+', 'এ বি-'], to: 'AB+' },
  { triggers: ['ও+', 'ও-', '0+', '0-', 'o+', 'o-'], to: 'O+' },
];
// Per-blood-group normalisation table (lowercased key → canonical)
const BG_NORMALISE: Record<string, string> = {};
for (const bg of ['A+','A-','B+','B-','AB+','AB-','O+','O-']) {
  BG_NORMALISE[bg.toLowerCase()] = bg;
}
for (const e of BG_BANGLA) {
  for (const t of e.triggers) BG_NORMALISE[t.toLowerCase()] = e.to;
}
// Override specific negatives
BG_NORMALISE['এ-'] = 'A-'; BG_NORMALISE['o-'] = 'O-'; BG_NORMALISE['0-'] = 'O-';
BG_NORMALISE['বি-'] = 'B-'; BG_NORMALISE['এবি-'] = 'AB-'; BG_NORMALISE['এ বি-'] = 'AB-';
BG_NORMALISE['ও-'] = 'O-';

// ── Districts: Banglish + Bangla → English district name ──
const DISTRICT_BANGLISH: NormaliseEntry[] = [
  { triggers: ['rangpur', 'rongpur', 'rongpoor', 'rangpor', 'রংপুর'], to: 'Rangpur' },
  { triggers: ['dinajpur', 'dinazpur', 'দিনাজপুর'], to: 'Dinajpur' },
  { triggers: ['kurigram', 'kurigam', 'kuri gram', 'কুড়িগ্রাম', 'কুরিগ্রাম'], to: 'Kurigram' },
  { triggers: ['lalmonirhat', 'lalmonirhaat', 'lal monirhat', 'lalmanirhat', 'lal monir hat', 'লালমনিরহাট'], to: 'Lalmonirhat' },
  { triggers: ['nilphamari', 'nilfamari', 'neelphamari', 'neel famari', 'নীলফামারী'], to: 'Nilphamari' },
  { triggers: ['gaibandha', 'gaibanda', 'gahibandha', 'gaibandah', 'গাইবান্ধা'], to: 'Gaibandha' },
  { triggers: ['thakurgaon', 'thakurganj', 'takurgaon', 'thakur gaon', 'ঠাকুরগাঁও'], to: 'Thakurgaon' },
  { triggers: ['panchagarh', 'panchagar', 'ponchogor', 'পঞ্চগড়'], to: 'Panchagarh' },
];

// ── Urgency: Banglish + Bangla → English ──
const URGENCY_BANGLISH: NormaliseEntry[] = [
  { triggers: ['critical', 'kritikal', 'ক্রিটিক্যাল', 'sankatjonok','সংকটজনক'], to: 'critical' },
  { triggers: ['urgent', 'jaruri', 'joruri', 'জরুরি', 'জরুরী'], to: 'urgent' },
  { triggers: ['normal', 'sadharon', 'সাধারণ'], to: 'normal' },
];

// ── Status: Banglish + Bangla → English ──
const STATUS_BANGLISH: NormaliseEntry[] = [
  { triggers: ['active', 'aktiv', 'এক্টিভ'], to: 'active' },
  { triggers: ['fulfilled', 'fulfill', 'purno', 'পূর্ণ'], to: 'fulfilled' },
  { triggers: ['expired', 'মেয়াদোত্তীর্ণ', 'meyad utturno', 'meyadutturno'], to: 'expired' },
  { triggers: ['cancelled', 'canceld', 'cancel', 'bad dewa', 'bad', 'বাতিল'], to: 'cancelled' },
];

// ── Tags / when_needed: Banglish + Bangla → English ──
const TAG_BANGLISH: NormaliseEntry[] = [
  { triggers: ['now', 'এখন', 'ekhon', 'akhon', 'akon'], to: 'now' },
  { triggers: ['today', 'আজ', 'aj'], to: 'today' },
  { triggers: ['tomorrow', 'আগামীকাল', 'kal', 'agamikal', 'agamikal'], to: 'tomorrow' },
  { triggers: ['dayafter', 'day after', 'পরশু', 'poroshu', 'porosh'], to: 'day_after' },
  { triggers: ['scheduled', 'নির্ধারিত', 'nirdharito'], to: 'specific_date' },
];

// ── Assignee: Banglish + Bangla → English ──
const ASSIGN_BANGLISH: NormaliseEntry[] = [
  { triggers: ['assigned', 'asigned', 'assign', 'বরাদ্দ', 'boraddo', 'baraddo'], to: 'assigned' },
  { triggers: ['unassigned', 'unasigned', 'unassign', 'অবরাদ্দ', 'oboraddo'], to: 'unassigned' },
];

// ── Flattened lookup tables (lowercased key → canonical value) ──
function buildLookup(entries: NormaliseEntry[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of entries) {
    for (const t of e.triggers) out[t.toLowerCase()] = e.to;
  }
  return out;
}
const DISTRICT_LOOKUP = buildLookup(DISTRICT_BANGLISH);
const URGENCY_LOOKUP  = buildLookup(URGENCY_BANGLISH);
const STATUS_LOOKUP   = buildLookup(STATUS_BANGLISH);
const TAG_LOOKUP      = buildLookup(TAG_BANGLISH);
const ASSIGN_LOOKUP   = buildLookup(ASSIGN_BANGLISH);

/** Replace any recognised Bangla/Banglish token in-place so the existing fuzzy matcher sees English. */
function normaliseBanglaQuery(query: string): string {
  let norm = query;

  // ── Step 0.5: Collapse multi-word blood-group phrases ──
  // "o positive" / "a -ve" / "ab positive" / Banglish: "posetiv","nagetive","pojetiv" → canonical "O+" etc.

  // First: normalise Bangla sign words → English so the patterns below catch everything
  norm = norm.replace(/পজিটিভ/gi, 'positive');
  norm = norm.replace(/নেগেটিভ/gi, 'negative');
  // Bangla blood-group letters → Latin (এবি must come BEFORE এ and বি)
  norm = norm.replace(/(?<![a-zA-Z])এবি\s*(?=positive|negative)/gi, 'AB ');
  norm = norm.replace(/(?<![a-zA-Z])এ\s*(?=positive|negative)/gi, 'A ');
  norm = norm.replace(/(?<![a-zA-Z])বি\s*(?=positive|negative)/gi, 'B ');
  norm = norm.replace(/(?<![a-zA-Z])ও\s*(?=positive|negative)/gi, 'O ');
  // Standalone "ও" followed by +/− → O
  norm = norm.replace(/(?<![a-zA-Z])ও\s*([+-])/gi, 'O$1');

  const BG_PATTERN = {
    o: /\bo\s*(?:(?:p[os]s?(?:itive|etive|etiv|jetive|jetiv|ijetiv?)?)|(?:neg(?:ative|etive|etiv|itive|etiv)?)|(?:\+\s*ve)|(?:-\s*ve)|(?:nag(?:etive|etiv|ative)?))/gi,
    a: /\ba\s*(?:(?:p[os]s?(?:itive|etive|etiv|jetive|jetiv|ijetiv?)?)|(?:neg(?:ative|etive|etiv|itive|etiv)?)|(?:\+\s*ve)|(?:-\s*ve)|(?:nag(?:etive|etiv|ative)?))/gi,
    b: /\bb\s*(?:(?:p[os]s?(?:itive|etive|etiv|jetive|jetiv|ijetiv?)?)|(?:neg(?:ative|etive|etiv|itive|etiv)?)|(?:\+\s*ve)|(?:-\s*ve)|(?:nag(?:etive|etiv|ative)?))/gi,
    ab: /\bab\s*(?:(?:p[os]s?(?:itive|etive|etiv|jetive|jetiv|ijetiv?)?)|(?:neg(?:ative|etive|etiv|itive|etiv)?)|(?:\+\s*ve)|(?:-\s*ve)|(?:nag(?:etive|etiv|ative)?))/gi,
  };
  const BG_REPLACE = (letter: string, m: string): string => {
    if (/neg|nag|-\s*ve/i.test(m)) return letter + '-';
    return letter + '+';
  };
  norm = norm.replace(BG_PATTERN.ab, m => BG_REPLACE('AB', m));
  norm = norm.replace(BG_PATTERN.b, m => BG_REPLACE('B', m));
  norm = norm.replace(BG_PATTERN.a, m => BG_REPLACE('A', m));
  norm = norm.replace(BG_PATTERN.o, m => BG_REPLACE('O', m));
  // Also collapse remaining "+VE" / "-VE" tokens: "O +VE" → "O+"
  norm = norm.replace(/\b\+\s*ve\b/gi, '+');
  norm = norm.replace(/\b-\s*ve\b/gi, '-');

  // ── Step 0.6: Strip noise / stopwords ──
  // Use Unicode-aware boundaries (not \b) because Bangla chars aren't matched by \w.
  const NOISE_WORDS = 'amar|babar|baba|ma|maa|jnno|jnne|jonno|janno|janne|lagbe|lagbe|lagbe na|lagbe ni|lagben|dorkar|proyojon|projozon|chai|চাই|dorun|দরকার|প্রয়োজন|ekta|ekti|1\\s*bag|2\\s*bag|bag|rokto|rokt|রক্ত|rakto|blod|blood|bloods|manush|manus|jon|jon er|joner|akta|akti|plz|pls|please|doya kore|kore|den|dao|dibi|dite|dewa|jan|akjon|ekjon|ke|স্যার|sir|mam|mamun|mama|bhaia|ভাইয়া|ভাই|apu|apu|আপু|dibo|lagena|lagna|আমার|জন্য|লাগবে|লাগেনা|প্লিজ|একটা|একটি|এক|১|২|আক্কজন|মানুষ';
  const NOISE_RE = new RegExp(`(?<=^|[\\s,;])(?:${NOISE_WORDS})(?=[\\s,;]|$)`, 'gi');
  norm = norm.replace(NOISE_RE, '').replace(/\s{2,}/g, ' ').trim();

  // ── Step 1: Replace multi-word Banglish phrases ──
  const phrases: { regex: RegExp; to: string }[] = [];
  for (const e of [...DISTRICT_BANGLISH, ...URGENCY_BANGLISH, ...STATUS_BANGLISH, ...TAG_BANGLISH, ...ASSIGN_BANGLISH]) {
    for (const t of e.triggers) {
      if (t.includes(' ')) phrases.push({ regex: new RegExp(t, 'gi'), to: e.to });
    }
  }
  for (const p of phrases) norm = norm.replace(p.regex, p.to);
  // Second: single-token words
  const allLookups = { ...DISTRICT_LOOKUP, ...URGENCY_LOOKUP, ...STATUS_LOOKUP, ...TAG_LOOKUP, ...ASSIGN_LOOKUP };
  // Also try to normalise blood groups at the query level
  norm = norm.replace(/([০১২৩৪৫৬৭৮৯]\s*[+-])/g, (m) => {
    const d = '০১২৩৪৫৬৭৮৯';
    const e = '0123456789';
    return m.split('').map(c => { const i = d.indexOf(c); return i >= 0 ? e[i] : c; }).join('');
  });
  return norm.replace(/[^\s]+/g, (token) => {
    // Try blood-group normalise first
    const bgKey = token.toLowerCase();
    if (BG_NORMALISE[bgKey]) return BG_NORMALISE[bgKey];
    // Then try general Banglish lookup
    const lc = token.toLowerCase();
    if (allLookups[lc]) return allLookups[lc];
    return token;
  });
}

/** Detect if a query contains Bangla Unicode characters (Bengali block U+0980-09FF). */
function hasBanglaScript(s: string): boolean {
  return /[\u0980-\u09FF]/.test(s);
}

/** Simple Bangla→English romanization for free-text fuzzy fallback. */
function romanizeBangla(s: string): string {
  const map: Record<string, string> = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'c', 'ছ': 'ch', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'z', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
    'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    '্': '', 'ং': 'ng', 'ঃ': 'h', 'ঁ': '',
    'ৎ': 't', '।': '',
  };
  let out = '';
  for (const ch of s) {
    out += map[ch] ?? ch;
  }
  // Clean up: remove repeated ngs, merge double letters
  return out.replace(/ngng/g, 'ng').replace(/([a-z])\1\1+/g, '$1$1');
}

/** Best-effort: convert any Banglish/English/Bangla input back to English keywords. */
function toEnglishKeywords(q: string): string {
  let out = normaliseBanglaQuery(q);
  // Normalise ASCII diacritics
  out = ascii(out);
  return out;
}

// ── Core fuzzy helpers ──
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const URGENCY_LEVELS = ['critical', 'urgent', 'normal'] as const;
// Frontend only ever receives visible requests (active + last-chance +
// recently-fulfilled with seal). Expired/cancelled/deleted never arrive.
const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses', color: 'slate' },
  { value: 'active', label: 'Active', color: 'emerald' },
  { value: 'fulfilled', label: 'Fulfilled', color: 'blue' },
] as const;
const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
] as const;
const TAG_OPTIONS = [
  { value: 'now', label: 'Needed Now' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'day_after', label: 'Day After' },
  { value: 'specific_date', label: 'Scheduled' },
] as const;
const ASSIGN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
] as const;
const SORT_OPTIONS = [
  { value: 'urgency', label: 'Urgency' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
] as const;

/** Resolve a request's coordinates, falling back to its upazila/district centroid. */
function requestCoords(req: any): { lat: number; lng: number } | null {
  if (typeof req.lat === 'number' && typeof req.lng === 'number') {
    return { lat: req.lat, lng: req.lng };
  }
  const upaName = (req.upazila || '').toLowerCase();
  if (upaName) {
    const upa = RANGPUR_UPAZILAS.find(
      (u) =>
        u.name_en.toLowerCase() === upaName ||
        u.name_bn === req.upazila ||
        u.name_en.toLowerCase().endsWith(upaName) ||
        u.name_en.toLowerCase().split(' ')[0] === upaName,
    );
    if (upa) return { lat: upa.lat, lng: upa.lng };
  }
  const distName = (req.district || '').toLowerCase();
  if (distName) {
    const d = RANGPUR_DISTRICTS.find(
      (x) => x.name_en.toLowerCase() === distName || x.name_bn === req.district,
    );
    if (d) return { lat: d.lat, lng: d.lng };
  }
  return null;
}

// SSR-safe map load — Leaflet touches `window` at import.
const ExploreMap = dynamic(
  () => import('@/components/map/ExploreMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full rounded-3xl bg-slate-100 animate-pulse" />
    ),
  },
);

export default function RequestsPage() {
  const t = useTranslations('common');
  const tMap = useTranslations('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<MapViewMode>('list');

  // ── Dedicated per-card share link (?req=<tracking_code|id>) ──
  // Opens the exact card in a popup with all card functions.
  const [focusedRequest, setFocusedRequest] = useState<any | null>(null);

  /** Map a raw request row to RequestCard props (shared by grid + popup). */
  const toCardProps = (r: any) => ({
    id: r.id,
    patient_name: r.patient_name,
    blood_group: r.blood_group,
    hospital_name: r.hospital_name,
    hospital_address: r.hospital_address,
    district: r.district,
    upazila: r.upazila,
    urgency_level: r.urgency_level,
    when_needed: r.when_needed,
    needed_date: r.needed_date,
    needed_time: r.needed_time,
    created_at: r.created_at,
    units_needed: r.units_needed,
    reason: r.reason,
    phone: r.contact_number,
    alternative_number: r.alternative_number,
    whatsapp_number: r.whatsapp_number,
    lat: r.lat,
    lng: r.lng,
    status: r.status,
    current_status: r.current_status,
    tracking_code: r.tracking_code,
    is_last_chance: r.is_last_chance,
    show_fulfilled_badge: r.show_fulfilled_badge,
    admin_notice: r.admin_notice,
    patient_hb_level: r.patient_hb_level ?? null,
    distance_km: r._distanceKm ?? null,
    view_count: r.view_count ?? 0,
  });

  const closeFocusedRequest = () => {
    setFocusedRequest(null);
    // Clean the ?req= param so refreshing doesn't reopen the popup
    if (typeof window !== 'undefined' && window.location.search.includes('req=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  useEffect(() => {
    const reqParam = new URLSearchParams(window.location.search).get('req');
    if (!reqParam) return;
    let cancelled = false;
    (async () => {
      // 1) The request may already be in the visible list
      let found = requests.find(
        (r) => r.tracking_code === reqParam || String(r.id) === reqParam,
      );
      // 2) Not visible in the list (e.g. fulfilled) → fetch it directly
      if (!found) {
        try {
          found = /^\d+$/.test(reqParam)
            ? await serverGetBloodRequestById(parseInt(reqParam))
            : await serverGetBloodRequestByTrackingCode(reqParam);
          if (!found && /^\d+$/.test(reqParam)) {
            found = await serverGetBloodRequestByTrackingCode(reqParam);
          }
        } catch {}
      }
      if (!cancelled && found) setFocusedRequest(found);
    })();
    return () => { cancelled = true; };
    // Re-check once the visible list loads (requests starts empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests.length, isLoading]);

  // ExploreMap state
  const [mapDonors, setMapDonors] = useState<any[]>([]);
  const [mapFilter, setMapFilter] = useState<DataFilter>('requests');
  const [mapBloodGroup, setMapBloodGroup] = useState<BloodGroup | null>(null);

  // Filters
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('urgency');
  const [aiMatches, setAiMatches] = useState<AIMatch[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastAiQuery, setLastAiQuery] = useState('');

  // ── Nearby: user location (GPS → cache → profile) + proximity sort ──
  const {
    location: userLocation,
    placeName: userPlaceName,
    isLocating,
    error: locationError,
    requestLocation,
  } = useUserLocation();
  const [nearMe, setNearMe] = useState(false);
  // When the AI/geocoder finds a place in the query (e.g. "Rangpur Medical"),
  // it becomes the proximity origin instead of the user's own location.
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const nearMeTouchedRef = useRef(false);

  // Auto-detect real-time location on first load (silent; errors ignored).
  // The location is available for when the user explicitly clicks "Near Me",
  // but we do NOT auto-enable nearest-first sorting — no default location.
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proximityOrigin = searchCenter || userLocation;

  const handleNearMeToggle = () => {
    nearMeTouchedRef.current = true;
    if (nearMe) {
      setNearMe(false);
      setSearchCenter(null);
      if (sortBy === 'nearest') setSortBy('urgency');
      return;
    }
    if (userLocation) {
      setNearMe(true);
      setSortBy('nearest');
    } else {
      setNearMe(true);
      setSortBy('nearest');
      requestLocation(); // ask for GPS; sorting kicks in once the fix arrives
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const [requestData, donorData] = await Promise.all([
        fetchRequestsData().catch(() => []),
        fetchDonorsData().catch(() => []),
      ]);
      setRequests(requestData);
      setMapDonors(donorData || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
    setIsLoading(false);
  };

  const urgencyOrder: Record<string, number> = { critical: 0, urgent: 1, normal: 2 };

  // Shared compact select style — highlighted red when a non-default value is active
  const selectCls = (active: boolean) =>
    `px-2 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium outline-none cursor-pointer transition-all max-w-[130px] sm:max-w-none ${
      active
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    }`;

  // Check if a request falls within the selected date range (state or AI overrides)
  const matchesDateRange = useCallback((createdAt: string, range?: string): boolean => {
    const effective = range || dateRangeFilter;
    if (effective === 'all') return true;
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return true;
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (effective === 'today') return diffDays < 1;
    if (effective === '7days') return diffDays <= 7;
    if (effective === '30days') return diffDays <= 30;
    return true;
  }, [dateRangeFilter]);

  const filteredData = useMemo<{ list: any[]; nearbyDistrict: string | null }>(() => {
    // Collect AI matches into a lookup (first match per category wins).
    // '__geocoded__' is a display-only chip (place found via geocoding) — it
    // sorts by distance but must not filter by district name.
    const aiLookup: Record<string, any> = {};
    for (const m of aiMatches) {
      if (m.value === '__geocoded__') continue;
      if (!(m.type in aiLookup)) aiLookup[m.type] = m.value;
    }
    // Merge manual filters with AI-corrected filters (manual takes precedence)
    const f = {
      bloodGroup: bloodGroupFilter || aiLookup.bloodGroup || null,
      urgency: urgencyFilter || aiLookup.urgency || null,
      district: districtFilter || aiLookup.district || null,
      status: (statusFilter !== 'all' ? statusFilter : null) || aiLookup.status || null,
      dateRange: dateRangeFilter !== 'all' ? dateRangeFilter : (aiLookup.dateRange || 'all'),
      tags: tagFilters.length > 0 ? tagFilters : (aiMatches.filter(m => m.type === 'tag').map(m => m.value)),
      assignee: assigneeFilter !== 'all' ? assigneeFilter : (aiLookup.assignee || 'all'),
    };

    // Run the main filter pass: AI structured filters + free-text search
    const hasAI = aiMatches.length > 0;
    const searchText = searchQuery.toLowerCase();
    let result = requests.filter(req => {
      // Free-text search only runs when AI hasn't matched anything (avoid double-filtering)
      const q = hasAI ? '' : searchText;
      const matchesSearch = !q ||
        (req.patient_name || '').toLowerCase().includes(q) ||
        (req.hospital_name || '').toLowerCase().includes(q) ||
        (req.district || '').toLowerCase().includes(q) ||
        (req.upazila || '').toLowerCase().includes(q) ||
        (req.reason || '').toLowerCase().includes(q);
      const matchesBloodGroup = !f.bloodGroup || req.blood_group === f.bloodGroup;
      const matchesUrgency = !f.urgency || req.urgency_level === f.urgency;
      // Case-insensitive so "rangpur" in the DB still matches the "Rangpur" chip
      const matchesDistrict = !f.district ||
        (req.district || '').toLowerCase() === f.district.toLowerCase();
      const matchesStatus = !f.status || req.status === f.status;
      const matchesDate = matchesDateRange(req.created_at, f.dateRange !== 'all' ? f.dateRange : undefined);
      const matchesTags = f.tags.length === 0 || f.tags.includes(req.when_needed);
      const matchesAssignee =
        f.assignee === 'all' ||
        (f.assignee === 'assigned' && !!req.donor_id) ||
        (f.assignee === 'unassigned' && !req.donor_id);
      return matchesSearch && matchesBloodGroup && matchesUrgency && matchesDistrict
        && matchesStatus && matchesDate && matchesTags && matchesAssignee;
    });

    // Fallback: if AI filters produced 0 results, use free-text search with manual filters only
    if (result.length === 0 && hasAI && searchText) {
      const engSearch = toEnglishKeywords(searchQuery);
      const fallbackTexts = [searchText, engSearch !== searchText ? engSearch : null].filter(Boolean) as string[];
      result = requests.filter(req => {
        const haystack = [
          (req.patient_name || ''),
          (req.hospital_name || ''),
          (req.district || ''),
          (req.upazila || ''),
          (req.reason || ''),
        ].join(' ').toLowerCase();
        const matchesSearch = fallbackTexts.some(t => haystack.includes(t));
        const matchesBloodGroup = !bloodGroupFilter || req.blood_group === bloodGroupFilter;
        const matchesUrgency = !urgencyFilter || req.urgency_level === urgencyFilter;
        const matchesDistrict = !districtFilter || req.district === districtFilter;
        const matchesStatus = (statusFilter === 'all') || req.status === statusFilter;
        const matchesDate = matchesDateRange(req.created_at);
        const matchesTags = tagFilters.length === 0 || tagFilters.includes(req.when_needed);
        const matchesAssignee =
          assigneeFilter === 'all' ||
          (assigneeFilter === 'assigned' && !!req.donor_id) ||
          (assigneeFilter === 'unassigned' && !req.donor_id);
        return matchesSearch && matchesBloodGroup && matchesUrgency && matchesDistrict
          && matchesStatus && matchesDate && matchesTags && matchesAssignee;
      });
    }

    // Fallback 3: fuzzy free-text — split query into tokens and do fuzzy match per token against each word in request fields
    if (result.length === 0 && searchText && !hasAI) {
      // Also try English-normalised + romanised Bangla versions of the query
      const engSearch = toEnglishKeywords(searchQuery);
      const romanSearch = hasBanglaScript(searchQuery) ? romanizeBangla(searchQuery) : '';
      const searchCandidates = [searchText, engSearch, romanSearch].filter(Boolean);
      const searchTokens = [...new Set(searchCandidates.flatMap(s => s.split(/[\s,;]+/).filter(Boolean)))];

      result = requests.filter(req => {
        const haystack = [
          (req.patient_name || ''),
          (req.hospital_name || ''),
          (req.district || ''),
          (req.upazila || ''),
          (req.reason || ''),
        ].join(' ').toLowerCase();
        const words = haystack.split(/[\s,;]+/).filter(Boolean);
        // At least one token must fuzzy-match one word in the haystack
        return searchTokens.some(token => {
          const t = token.toLowerCase();
          // Quick exact substring check first
          if (haystack.includes(t)) return true;
          // Try fuzzy against each word
          for (const w of words) {
            const dist = levenshtein(t, w);
            const maxD = t.length <= 2 ? 1 : t.length <= 4 ? 2 : 3;
            if (dist <= maxD) return true;
          }
          return false;
        });
      });
    }

    // ── Similar-context fallback ──
    // The (AI-corrected or manual) district was understood, but it has no
    // visible requests right now → relax ONLY the district constraint and
    // show the nearest districts' requests, ordered by road distance from the
    // searched district's centroid. The UI shows a banner explaining this.
    let nearbyDistrict: string | null = null;
    if (result.length === 0 && f.district) {
      const target = RANGPUR_DISTRICTS.find(
        d => d.name_en.toLowerCase() === f.district.toLowerCase(),
      );
      if (target) {
        result = requests.filter(req => {
          const matchesBloodGroup = !f.bloodGroup || req.blood_group === f.bloodGroup;
          const matchesUrgency = !f.urgency || req.urgency_level === f.urgency;
          const matchesStatus = !f.status || req.status === f.status;
          const matchesDate = matchesDateRange(req.created_at, f.dateRange !== 'all' ? f.dateRange : undefined);
          const matchesTags = f.tags.length === 0 || f.tags.includes(req.when_needed);
          const matchesAssignee =
            f.assignee === 'all' ||
            (f.assignee === 'assigned' && !!req.donor_id) ||
            (f.assignee === 'unassigned' && !req.donor_id);
          return matchesBloodGroup && matchesUrgency && matchesStatus
            && matchesDate && matchesTags && matchesAssignee;
        });
        if (result.length > 0) {
          nearbyDistrict = f.district;
          for (const r of result) {
            const c = requestCoords(r);
            r._distanceKm = c ? haversineKm(target.lat, target.lng, c.lat, c.lng) : null;
          }
          result.sort((a, b) =>
            (a._distanceKm ?? Number.POSITIVE_INFINITY) - (b._distanceKm ?? Number.POSITIVE_INFINITY)
          );
        }
      }
    }

    // Attach distance (km) from the proximity origin when known, so cards can
    // show "X km away" and the nearest sort can order by it.
    if (proximityOrigin && !nearbyDistrict) {
      for (const r of result) {
        const c = requestCoords(r);
        r._distanceKm = c
          ? haversineKm(proximityOrigin.lat, proximityOrigin.lng, c.lat, c.lng)
          : null;
      }
    }

    // Shared urgency bucket function
    // Priority: critical(0) → urgent(1) → last-chance normal(2) → normal(3) → fulfilled(4)
    const bucketOf = (r: any) => {
      if (r.status === 'fulfilled') return 4;
      const u = urgencyOrder[r.urgency_level] ?? 3;
      if (u <= 1) return u; // critical & urgent always top
      if (r.is_last_chance) return 2; // pin last-chance normal above regular normal
      return 3;
    };

    // Sort
    if (sortBy === 'nearest' && proximityOrigin && !nearbyDistrict) {
      // Nearest first — urgency breaks ties at the same distance, then recency.
      result.sort((a, b) => {
        const da = a._distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b._distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db || bucketOf(a) - bucketOf(b) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sortBy === 'urgency') {
      // Bucket order: critical → urgent → last-chance (pinned) → normal →
      // fulfilled (completed seal sinks to the bottom until it vanishes).
      result.sort((a, b) =>
        bucketOf(a) - bucketOf(b) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return { list: result, nearbyDistrict };
  }, [requests, searchQuery, bloodGroupFilter, urgencyFilter, districtFilter,
      statusFilter, dateRangeFilter, tagFilters, assigneeFilter, sortBy, matchesDateRange,
      aiMatches, proximityOrigin]);

  const filteredRequests = filteredData.list;
  const nearbyFallbackDistrict = filteredData.nearbyDistrict;

  // Resolve request coords (GPS → upazila/district centroid) so pins render
  // even when the request was created without capturing exact GPS.
  const filteredRequestsWithCoords = useMemo(
    () =>
      filteredRequests.map((r: any) => {
        if (typeof r.lat === "number" && typeof r.lng === "number") return r;
        const c = requestCoords(r);
        return c ? { ...r, lat: c.lat, lng: c.lng } : r;
      }),
    [filteredRequests],
  );

  /** Remove the active district constraint (AI chip or manual select). */
  const clearDistrictFilter = () => {
    setDistrictFilter(null);
    setAiMatches(prev => prev.filter(m => m.type !== 'district'));
  };

  // Count active filters for visual indicators
  const activeFilterCount = [
    bloodGroupFilter, urgencyFilter, districtFilter,
    statusFilter !== 'all' ? statusFilter : null,
    dateRangeFilter !== 'all' ? dateRangeFilter : null,
    tagFilters.length > 0 ? 'tags' : null,
    assigneeFilter !== 'all' ? assigneeFilter : null,
  ].filter(Boolean).length + aiMatches.length;

  const toggleTag = (tag: string) => {
    setTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setBloodGroupFilter(null);
    setUrgencyFilter(null);
    setDistrictFilter(null);
    setStatusFilter('all');
    setDateRangeFilter('all');
    setTagFilters([]);
    setAssigneeFilter('all');
    setSearchQuery('');
    setSearchCenter(null);
    nearMeTouchedRef.current = true;
    setNearMe(false);
    if (sortBy === 'nearest') setSortBy('urgency');
  };

  // ── AI Tokenizer: split → normalise → fuzzy-match → return match cards ──
  const parseAIQuery = useCallback((raw: string): AIMatch[] => {
    const matches: AIMatch[] = [];
    const seen = new Set<string>(); // avoid duplicates per category
    const rawTrim = raw.trim();
    if (!rawTrim) return matches;

    // ═══ Step 0: Normalise Bangla / Banglish → English ═══
    const engQuery = toEnglishKeywords(rawTrim);
    const q = engQuery;

    // Normalise & split into tokens (zero→O already handled by BG_NORMALISE)
    const normQ = q.replace(/[0０]/g, 'O'); // zero → O for blood groups
    const tokensRaw = normQ.split(/[\s,;]+/).filter(Boolean);
    // Also build sliding windows of 2-3 consecutive tokens for phrases
    const windows: { text: string; originalSpan: string }[] = [];
    for (let i = 0; i < tokensRaw.length; i++) {
      windows.push({ text: tokensRaw[i], originalSpan: tokensRaw[i] });
      if (i + 1 < tokensRaw.length) {
        windows.push({ text: tokensRaw[i] + ' ' + tokensRaw[i + 1], originalSpan: tokensRaw[i] + ' ' + tokensRaw[i + 1] });
        if (i + 2 < tokensRaw.length) {
          windows.push({
            text: tokensRaw[i] + ' ' + tokensRaw[i + 1] + ' ' + tokensRaw[i + 2],
            originalSpan: tokensRaw[i] + ' ' + tokensRaw[i + 1] + ' ' + tokensRaw[i + 2],
          });
        }
      }
    }

    // Helper: check for tag phrases (natural language)
    const tagPhrases: { pattern: RegExp; value: string }[] = [
      { pattern: /\bneeded?\s*now\b|\bright\s*now\b/i, value: 'now' },
      { pattern: /\bneeded?\s*today\b/i, value: 'today' },
      { pattern: /\btomorrow\b/i, value: 'tomorrow' },
      { pattern: /\bday\s*after\b/i, value: 'day_after' },
      { pattern: /\bscheduled\b/i, value: 'specific_date' },
    ];
    for (const tp of tagPhrases) {
      if (tp.pattern.test(q) && !seen.has('tag:' + tp.value)) {
        seen.add('tag:' + tp.value);
        matches.push({ type: 'tag', original: '', corrected: tp.value, label: TAG_NATURAL_MAP[tp.value] || tp.value, value: tp.value });
      }
    }

    // Helper: date-range phrases (including fuzzy-tolerant "yesterday" with common typos)
    const YESTERDAY_FUZZY = /\b(y[ea]sterd[ae]y|yestr?d[ae]y|yst[ae]rd[ae]y|yesterd[ae]y|yesterday)\b/i;
    if (YESTERDAY_FUZZY.test(q) && !seen.has('dateRange')) {
      seen.add('dateRange'); matches.push({ type: 'dateRange', original: '', corrected: 'today', label: 'Yesterday', value: 'today' });
    }
    if (/\blast\s*7\s*days?\b|\bthis\s*week\b/i.test(q) && !seen.has('dateRange')) {
      seen.add('dateRange'); matches.push({ type: 'dateRange', original: '', corrected: '7days', label: 'Last 7 days', value: '7days' });
    }
    if (/\blast\s*30\s*days?\b|\bthis\s*month\b/i.test(q) && !seen.has('dateRange')) {
      seen.add('dateRange'); matches.push({ type: 'dateRange', original: '', corrected: '30days', label: 'Last 30 days', value: '30days' });
    }
    if (/\btoday\b/i.test(q) && !/\bneeded?\s+today\b/i.test(q) && !seen.has('dateRange')) {
      seen.add('dateRange'); matches.push({ type: 'dateRange', original: '', corrected: 'today', label: 'Today', value: 'today' });
    }

    // Process each token-window through fuzzy matchers
    for (const w of windows) {
      const t = w.originalSpan;

      // Blood group — apply normalisation map first, then fuzzy
      if (!seen.has('bloodGroup')) {
        const bgNorm = BLOOD_NORMALIZE[t.toLowerCase()] || t;
        const bgMatch = fuzzyBest(bgNorm, BLOOD_GROUPS as unknown as readonly string[], 1);
        if (bgMatch) {
          seen.add('bloodGroup');
          matches.push({ type: 'bloodGroup', original: w.originalSpan, corrected: bgMatch, label: bgMatch, value: bgMatch });
          continue;
        }
      }

      // District — fuzzy against RANGPUR_DISTRICTS
      if (!seen.has('district')) {
        const districtNames = RANGPUR_DISTRICTS.map(d => d.name_en);
        const dm = fuzzyBest(t, districtNames, 3);
        if (dm) {
          seen.add('district');
          matches.push({ type: 'district', original: w.originalSpan, corrected: dm, label: dm, value: dm });
          continue;
        }
      }

      // Urgency
      if (!seen.has('urgency')) {
        const um = fuzzyBest(t, AI_DICT_URGENCY as unknown as readonly string[], 3);
        if (um) {
          seen.add('urgency');
          matches.push({ type: 'urgency', original: w.originalSpan, corrected: um, label: um.charAt(0).toUpperCase() + um.slice(1), value: um });
          continue;
        }
      }

      // Status
      if (!seen.has('status')) {
        const sm = fuzzyBest(t, AI_DICT_STATUS as unknown as readonly string[], 2);
        if (sm && sm !== 'active') { // active is default, skipping avoids noise
          seen.add('status');
          matches.push({ type: 'status', original: w.originalSpan, corrected: sm, label: sm.charAt(0).toUpperCase() + sm.slice(1), value: sm });
          continue;
        }
      }

      // Tag (when_needed) — fuzzy match single tokens against tag names
      const TAG_KEYS = ['now', 'today', 'tomorrow', 'day_after', 'specific_date'];
      const tm = fuzzyBest(t, TAG_KEYS, 2);
      if (tm && !seen.has('tag:' + tm)) {
        seen.add('tag:' + tm);
        matches.push({ type: 'tag', original: w.originalSpan, corrected: tm, label: TAG_NATURAL_MAP[tm] || tm, value: tm });
        continue;
      }

      // Assignee
      if (!seen.has('assignee')) {
        const am = fuzzyBest(t, AI_DICT_ASSIGN as unknown as readonly string[], 3);
        if (am) {
          seen.add('assignee');
          matches.push({ type: 'assignee', original: w.originalSpan, corrected: am, label: am.charAt(0).toUpperCase() + am.slice(1), value: am });
          continue;
        }
      }
    }

    return matches;
  }, []);

  // Live rule-based AI parsing while typing (local, no network) — debounced
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setAiMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      try {
        setAiMatches(parseAIQuery(q));
      } catch {
        setAiMatches([]);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, parseAIQuery]);

  // Manual search: triggered by button click or Enter key — AI manages everything
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setAiMatches([]);
      return;
    }
    if (q === lastAiQuery) return; // already searched this exact query
    setLastAiQuery(q);

    setSearchCenter(null);

    // Step 1: rule-based parser → instant structured matches
    let ruleMatches: AIMatch[] = [];
    try {
      ruleMatches = parseAIQuery(q);
      setAiMatches(ruleMatches);
    } catch (_err) {
      setAiMatches([]);
    }

    // If a place was detected, show the map right away.
    if (ruleMatches.some(m => m.type === 'district')) {
      setViewMode('map');
    }

    // Step 2: call LLM (DeepSeek / GLM) for typo correction & Bangla/Banglish understanding
    setIsAiLoading(true);
    try {
      const result = await serverParseSearchQuery(q);
      if (!result.ai_used) {
        setIsAiLoading(false);
        return;
      }

      const llmMatches: AIMatch[] = [];

      if (result.blood_group) {
        llmMatches.push({
          type: 'bloodGroup' as AIMatch['type'],
          original: '',
          corrected: result.blood_group,
          label: result.blood_group,
          value: result.blood_group,
        } as AIMatch);
      }
      if (result.district_id) {
        const d = RANGPUR_DISTRICTS.find(x => x.id === result.district_id);
        const name = d ? d.name_en : result.district_id;
        llmMatches.push({
          type: 'district' as AIMatch['type'],
          original: '',
          corrected: name,
          label: name,
          value: name,
        } as AIMatch);
      }
      if (result.upazila_id) {
        const upa = RANGPUR_UPAZILAS.find(x => x.id === result.upazila_id);
        const name = upa ? upa.name_en : result.upazila_id;
        llmMatches.push({
          type: 'other' as AIMatch['type'],
          original: '',
          corrected: name,
          label: `Upazila: ${name}`,
          value: name,
        } as AIMatch);
      }

      // Merge LLM matches with rule-based matches
      setAiMatches(prev => {
        const llmTypes = new Set(llmMatches.map(m => m.type));
        const kept = prev.filter(m => !llmTypes.has(m.type));
        return [...kept, ...llmMatches];
      });

      // AI found a place → show the map.
      if (result.district_id || result.upazila_id) {
        setViewMode('map');
      } else if (result.keywords && result.keywords.trim().length >= 3) {
        // No known district/upazila — the leftover text might be a hospital or
        // local place name. Forward-geocode it (with AI typo correction inside)
        // and, if found, make it the proximity origin + show the map.
        try {
          const places = await forwardGeocode(result.keywords.trim());
          if (places.length > 0) {
            const p = places[0];
            const short = p.displayName.split(',').slice(0, 2).join(',').trim();
            setSearchCenter({ lat: p.lat, lng: p.lng, label: short });
            setSortBy('nearest');
            setViewMode('map');
            setAiMatches(prev => [
              ...prev,
              {
                type: 'district',
                original: result.keywords,
                corrected: short,
                label: `Near ${short}`,
                value: '__geocoded__',
              } as AIMatch,
            ]);
          }
        } catch {
          // geocoding is best-effort
        }
      }
    } catch (_err) {
      // LLM failed — rule-based results already shown
    } finally {
      setIsAiLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, lastAiQuery]);

  // When the in-map search bar detects a blood group
  const handleBloodGroupDetected = (bg: BloodGroup | null) => {
    setMapBloodGroup(bg);
    if (bg) {
      setMapFilter('donors');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-grow w-full px-5 sm:px-8 lg:px-12 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 tracking-tight">{t('requests')}</h1>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-2xl">
            Urgent blood requirements in Rangpur division. Your donation can save a life.
          </p>
        </div>

        {/* Controls — compact: search row + blood-group pills + one select row.
            Every filter is visible; nothing hidden behind toggles. */}
        <div className="mb-4 sm:mb-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Row 1: Search + view toggle + Post CTA */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5">
            <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400 pointer-events-none" />
              <input
                type="text"
                placeholder={'Search blood group, district, urgency… e.g. "critical O+ Rangpur"'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full pl-8 pr-[64px] py-2 rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none text-xs sm:text-sm transition-all"
              />
              {/* AI badge: animated while the LLM is processing */}
              <span className="absolute right-6 top-1/2 -translate-y-1/2">
                <AiThinkingBadge loading={isAiLoading} />
              </span>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setAiMatches([]); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Near Me — nearest-first proximity sort */}
            <button
              onClick={handleNearMeToggle}
              className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg border text-xs font-semibold transition-all active:scale-[0.97] shrink-0 ${
                nearMe
                  ? 'border-green-300 bg-green-50 text-green-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:text-green-600 hover:bg-green-50/50'
              }`}
              aria-label="Show nearest requests first"
              aria-pressed={nearMe}
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Near Me</span>
            </button>

            <MapToggle value={viewMode} onChange={setViewMode} />

            <Link
              href="/request"
              className="inline-flex items-center justify-center gap-1.5 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all shadow-sm shadow-red-200/50 text-xs active:scale-[0.97] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Post Request</span>
              <span className="sm:hidden">Post</span>
            </Link>
          </div>

          {/* ── AI match cards — one card per detected + corrected token ── */}
          {aiMatches.length > 0 && (
            <div className="px-2.5 sm:px-3 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 text-[10px] font-bold select-none shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  Matched
                </span>
                {aiMatches.map((match, i) => {
                  const isCorrected = match.original.toLowerCase() !== match.corrected.toLowerCase() && match.original.length > 0;
                  const CARD_STYLE: Record<string, string> = {
                    bloodGroup: 'border-red-200 bg-red-50 text-red-700',
                    district:   'border-indigo-200 bg-indigo-50 text-indigo-700',
                    status:     'border-emerald-200 bg-emerald-50 text-emerald-700',
                    urgency:    'border-amber-200 bg-amber-50 text-amber-700',
                    tag:        'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
                    assignee:   'border-purple-200 bg-purple-50 text-purple-700',
                    dateRange:  'border-sky-200 bg-sky-50 text-sky-700',
                  };
                  const CARD_ICON: Record<string, React.ReactNode> = {
                    bloodGroup: <Droplet className="w-3 h-3" />,
                    district:   <MapPin className="w-3 h-3" />,
                    status:     <Activity className="w-3 h-3" />,
                    urgency:    <AlertTriangle className="w-3 h-3" />,
                    tag:        <Tag className="w-3 h-3" />,
                    assignee:   <UserCheck className="w-3 h-3" />,
                    dateRange:  <Calendar className="w-3 h-3" />,
                  };
                  return (
                    <span
                      key={`${match.type}-${match.value}-${i}`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition-all ${CARD_STYLE[match.type] || 'border-slate-200 bg-slate-50 text-slate-700'}`}
                    >
                      {CARD_ICON[match.type]}
                      {isCorrected ? (
                        <span className="flex items-baseline gap-0.5">
                          <span className="line-through opacity-50 font-normal text-[10px]">{match.original}</span>
                          <span className="text-inherit">→</span>
                          <span className="font-bold">{match.label}</span>
                        </span>
                      ) : (
                        <span className="font-bold">{match.label}</span>
                      )}
                      <button
                        onClick={() => {
                          if (match.value === '__geocoded__') setSearchCenter(null);
                          setAiMatches(prev => prev.filter((_, idx) => idx !== i));
                        }}
                        className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                        aria-label={`Remove ${match.label} filter`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  );
                })}
                <button
                  onClick={() => setAiMatches([])}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2 ml-1 shrink-0 transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}



          {/* Row 2: Blood group pills — one-tap, scrollable on phones */}
          <div className="px-2 sm:px-2.5 pb-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
              <span className="inline-flex items-center gap-1 pr-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                <Droplet className="w-3 h-3 text-red-500" />
                <span className="hidden sm:inline">Group</span>
              </span>
              <button
                onClick={() => setBloodGroupFilter(null)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all active:scale-[0.97] ${
                  bloodGroupFilter === null
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white'
                }`}
              >
                All
              </button>
              {BLOOD_GROUPS.map(bg => (
                <button
                  key={bg}
                  onClick={() => setBloodGroupFilter(bloodGroupFilter === bg ? null : bg)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all active:scale-[0.97] ${
                    bloodGroupFilter === bg
                      ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-200/50'
                      : 'border-slate-200 text-slate-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50 bg-white'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: every other filter as a compact select — all visible */}
          <div className="px-2 sm:px-2.5 pb-2 sm:pb-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
            {/* Priority */}
            <select
              value={urgencyFilter || ''}
              onChange={(e) => setUrgencyFilter(e.target.value || null)}
              className={selectCls(!!urgencyFilter)}
              aria-label="Priority"
            >
              <option value="">All priorities</option>
              {URGENCY_LEVELS.map(level => (
                <option key={level} value={level} className="capitalize">{level}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectCls(statusFilter !== 'all')}
              aria-label="Status"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* When needed (tags) */}
            <select
              value={tagFilters[0] || ''}
              onChange={(e) => setTagFilters(e.target.value ? [e.target.value] : [])}
              className={selectCls(tagFilters.length > 0)}
              aria-label="When needed"
            >
              <option value="">Any time</option>
              {TAG_OPTIONS.map(tag => (
                <option key={tag.value} value={tag.value}>{tag.label}</option>
              ))}
            </select>

            {/* District */}
            <select
              value={districtFilter || ''}
              onChange={(e) => setDistrictFilter(e.target.value || null)}
              className={selectCls(!!districtFilter)}
              aria-label="District"
            >
              <option value="">All districts</option>
              {RANGPUR_DISTRICTS.map(d => (
                <option key={d.id} value={d.name_en}>{d.name_en}</option>
              ))}
            </select>

            {/* Date range */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className={selectCls(dateRangeFilter !== 'all')}
              aria-label="Date range"
            >
              {DATE_RANGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Assignee */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className={selectCls(assigneeFilter !== 'all')}
              aria-label="Assignee"
            >
              {ASSIGN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => {
                const v = e.target.value;
                setSortBy(v);
                nearMeTouchedRef.current = true;
                if (v === 'nearest') {
                  setNearMe(true);
                  if (!userLocation) requestLocation();
                } else {
                  setNearMe(false);
                  setSearchCenter(null);
                }
              }}
              className={selectCls(sortBy === 'nearest')}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
              ))}
            </select>

            {/* Active proximity chip — shows the origin + lets users turn it off */}
            {nearMe && (searchCenter || userLocation) && (
              <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 text-[11px] font-semibold">
                <Navigation className="w-3 h-3" />
                {searchCenter
                  ? `Near ${searchCenter.label}`
                  : `Nearest first${userPlaceName ? ` · ${userPlaceName}` : ''}`}
                <button
                  onClick={handleNearMeToggle}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-green-100 transition-colors"
                  aria-label="Turn off nearest-first"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {locationError && nearMe && (
              <span className="text-[11px] text-red-500">{locationError}</span>
            )}

            {/* Clear all — only when something is filtered */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{filteredRequests.length}</span>{' '}
              {filteredRequests.length === 1 ? 'request' : 'requests'} found
              {searchQuery && (
                <span className="text-slate-400"> for &ldquo;{searchQuery}&rdquo;</span>
              )}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Similar-context banner: searched district understood, but empty */}
        {!isLoading && nearbyFallbackDistrict && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-amber-800">
                No active requests in {nearbyFallbackDistrict} right now
              </p>
              <p className="text-[11px] sm:text-xs text-amber-700">
                Showing the nearest districts with active requests, closest first.
              </p>
            </div>
            <button
              onClick={clearDistrictFilter}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-[11px] font-semibold hover:bg-amber-100 transition-colors"
            >
              <X className="w-3 h-3" />
              Show all
            </button>
          </div>
        )}

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : viewMode === 'map' ? (
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <ExploreMap
              donors={mapDonors}
              requests={filteredRequestsWithCoords}
              height={500}
              filter={mapFilter}
              onFilterChange={setMapFilter}
              bloodGroupFilter={mapBloodGroup}
              onBloodGroupDetected={handleBloodGroupDetected}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="@container/card">
                  <RequestCard request={toCardProps(request)} />
                </div>
              ))}
            </div>

            {filteredRequests.length === 0 && (
              <div className="text-center py-16 sm:py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Search className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  {aiMatches.length > 0
                    ? 'No requests matched your search'
                    : tMap('no_active_requests') || 'No requests found'}
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  {activeFilterCount > 0
                    ? 'Try adjusting or clearing your filters to see more results.'
                    : 'Everything seems to be under control. New requests will appear here.'}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Per-card share popup (?req=…) — the exact same card, all functions ── */}
      {focusedRequest && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && closeFocusedRequest()}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md my-8 sm:my-0 @container/card">
            <div className="flex justify-end mb-2">
              <button
                onClick={closeFocusedRequest}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <RequestCard request={toCardProps(focusedRequest)} />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
