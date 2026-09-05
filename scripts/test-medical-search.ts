/**
 * Quick smoke test for medical/clinic/medical-institution search.
 *
 * Runs a set of EN / BN / Banglish queries through `serverSearchMedicalPlace`
 * (the same function the request page's search box uses) and prints a summary
 * for each: whether it looked medical, how many results came back, and the
 * top result's shortName.
 *
 * Usage: npx tsx scripts/test-medical-search.ts
 */
import { serverSearchMedicalPlace } from "../lib/forward-geocode-server";
import type { PlaceSearchResult } from "../lib/forward-geocode";

interface TestCase {
  label: string;
  query: string;
  expectedMedical: boolean;
}

const TEST_CASES: TestCase[] = [
  // ── English ─────────────────────────────────────────────────────────
  { label: "EN · Rangpur Medical College Hospital", query: "Rangpur Medical College Hospital", expectedMedical: true },
  { label: "EN · RMCH (acronym)", query: "RMCH", expectedMedical: true },
  { label: "EN · hospital near Rangpur", query: "hospital near Rangpur", expectedMedical: true },
  { label: "EN · clinic in Saidpur", query: "clinic in Saidpur", expectedMedical: true },
  { label: "EN · medical college", query: "medical college Rangpur", expectedMedical: true },
  { label: "EN · non-medical baseline", query: "Rangpur railway station", expectedMedical: false },

  // ── Bengali (Bangla script) ─────────────────────────────────────────
  { label: "BN · রংপুর মেডিকেল কলেজ হাসপাতাল", query: "রংপুর মেডিকেল কলেজ হাসপাতাল", expectedMedical: true },
  { label: "BN · হাসপাতাল খুঁজুন", query: "রংপুরে হাসপাতাল খুঁজুন", expectedMedical: true },
  { label: "BN · ক্লিনিক দিনাজপুর", query: "দিনাজপুর ক্লিনিক", expectedMedical: true },
  { label: "BN · non-medical baseline", query: "রংপুর রেলস্টেশন", expectedMedical: false },

  // ── Banglish (Romanised Bengali) ────────────────────────────────────
  { label: "Banglish · Rongpur medical college hospotal (typo)", query: "Rongpur medical college hospotal", expectedMedical: true },
  { label: "Banglish · RMCH hospital", query: "RMCH hospital", expectedMedical: true },
  { label: "Banglish · haspatal Rangpur", query: "Rangpur e haspatal koi", expectedMedical: true },
  { label: "Banglish · Thakurgaon clinic", query: "Thakurgaon clinic", expectedMedical: true },
  { label: "Banglish · non-medical baseline", query: "Nilphamari bus stand", expectedMedical: false },
];

function summarise(r: PlaceSearchResult) {
  return {
    shortName: r.shortName,
    displayName: r.displayName.slice(0, 120) + (r.displayName.length > 120 ? "…" : ""),
    type: r.type,
    lat: r.lat.toFixed(4),
    lng: r.lng.toFixed(4),
    placeId: typeof r.placeId === "number" && r.placeId < 0 ? "LOCAL_FALLBACK" : r.placeId,
  };
}

async function runOne(tc: TestCase) {
  const t0 = Date.now();
  let results: PlaceSearchResult[] = [];
  let error: string | null = null;
  try {
    results = await serverSearchMedicalPlace(tc.query);
  } catch (e: any) {
    error = e?.message || String(e);
  }
  const ms = Date.now() - t0;

  const top = results[0];
  const usedFallback = top ? typeof top.placeId === "number" && top.placeId < 0 : false;

  console.log(
    JSON.stringify(
      {
        label: tc.label,
        query: tc.query,
        expectedMedical: tc.expectedMedical,
        ms,
        ok: error == null,
        error,
        resultCount: results.length,
        usedLocalFallback: usedFallback,
        topResult: top ? summarise(top) : null,
        top3: results.slice(0, 3).map(summarise),
      },
      null,
      2,
    ),
  );
  return { tc, results, error };
}

(async () => {
  console.log("== Medical search smoke test ==");
  console.log(`Queries: ${TEST_CASES.length}`);
  console.log("");

  let pass = 0;
  let fail = 0;
  for (const tc of TEST_CASES) {
    try {
      await runOne(tc);
      pass++;
    } catch (e) {
      console.log(`UNHANDLED ERROR for ${tc.label}:`, e);
      fail++;
    }
    console.log("---");
    // Small courtesy delay so we don't hammer Nominatim
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\nDone. ${pass} passed formatting, ${fail} threw.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
