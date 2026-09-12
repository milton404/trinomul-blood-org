"use server";

/**
 * RAG (Retrieval-Augmented Generation) system — hybrid pipeline.
 *
 * Retrieval = lexical token-overlap (instant, offline) + Zhipu
 * embedding-3 semantic search (bounded 2.5s timeout), fused with
 * Reciprocal Rank Fusion (RRF). Works for Bangla, English and
 * Banglish queries since knowledge docs are bilingual.
 *
 * Knowledge sources:
 *  - FAQ_DOCUMENTS (static authoritative content)
 *  - Live DB snapshot (donors, inventory, requests — summarized)
 *
 * IMPORTANT: the live DB snapshot goes through the Supabase-aware
 * `serverGet*` wrappers in lib/db-actions.ts, NOT through raw SQLite.
 * In production (DATABASE_URL set) the app serves Supabase data, so a
 * SQLite read here would feed the model stale/empty numbers and invite
 * hallucination. Embeddings are persisted in Supabase too, so cold
 * starts do not lose the semantic index; SQLite remains the local-dev
 * fallback only.
 */

import { getDb } from "@/lib/db";
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";
import {
  serverGetBloodInventory,
  serverGetActiveBloodRequests,
  serverGetProfilesByRole,
} from "@/lib/db-actions";
import { FAQ_DOCUMENTS } from "./faq-content";

// ── Types ───────────────────────────────────────────────────────────

export interface RetrievedChunk {
  id: string;
  source: "faq" | "db";
  category: string;
  content: string;
  score: number; // fused RRF score (higher = better)
}

interface StoredDoc {
  id: string;
  source: "faq" | "db";
  category: string;
  content: string;
}

// ── Table schema ────────────────────────────────────────────────────

const EMBEDDINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS rag_embeddings (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    embedding TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const INDEX_HASH_TABLE = `
  CREATE TABLE IF NOT EXISTS rag_index_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const PG_EMBEDDINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS rag_embeddings (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    embedding JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const PG_INDEX_HASH_TABLE = `
  CREATE TABLE IF NOT EXISTS rag_index_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

function ensureSqliteTables() {
  const db = getDb();
  db.exec(EMBEDDINGS_TABLE);
  db.exec(INDEX_HASH_TABLE);
}

let pgTablesReady = false;

async function ensurePgTables() {
  if (pgTablesReady) return;
  await pgQuery(PG_EMBEDDINGS_TABLE);
  await pgQuery(PG_INDEX_HASH_TABLE);
  pgTablesReady = true;
}

// ── Embedding storage backend (Supabase in prod, SQLite in dev) ──────

/** id → content_hash for every stored document. */
async function readStoredHashes(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (isSupabaseAvailable()) {
    await ensurePgTables();
    const { rows } = await pgQuery<{ id: string; content_hash: string }>(
      "SELECT id, content_hash FROM rag_embeddings",
    );
    for (const r of rows) map.set(r.id, r.content_hash);
    return map;
  }
  const db = getDb();
  ensureSqliteTables();
  const rows = db
    .prepare("SELECT id, content_hash FROM rag_embeddings")
    .all() as { id: string; content_hash: string }[];
  for (const r of rows) map.set(r.id, r.content_hash);
  return map;
}

/**
 * Stored documents with their embedding vectors. `embedding` is a JSONB
 * array under Postgres (already parsed by `pg`) but a JSON string under
 * SQLite — the caller normalises both shapes.
 */
async function readEmbeddingRows(): Promise<
  { id: string; embedding: number[] | string }[]
> {
  if (isSupabaseAvailable()) {
    await ensurePgTables();
    const { rows } = await pgQuery<{ id: string; embedding: number[] | string }>(
      "SELECT id, embedding FROM rag_embeddings",
    );
    return rows;
  }
  const db = getDb();
  ensureSqliteTables();
  return db
    .prepare("SELECT id, embedding FROM rag_embeddings")
    .all() as { id: string; embedding: number[] | string }[];
}

/** Doc metadata used to rehydrate the in-memory corpus on a cold start. */
async function readStoredDocs(): Promise<StoredDoc[]> {
  if (isSupabaseAvailable()) {
    await ensurePgTables();
    const { rows } = await pgQuery<{
      id: string;
      source: string;
      category: string;
      content: string;
    }>("SELECT id, source, category, content FROM rag_embeddings");
    return rows.map((r) => ({
      id: r.id,
      source: r.source as "faq" | "db",
      category: r.category,
      content: r.content,
    }));
  }
  const db = getDb();
  ensureSqliteTables();
  const rows = db
    .prepare("SELECT id, source, category, content FROM rag_embeddings")
    .all() as { id: string; source: string; category: string; content: string }[];
  return rows.map((r) => ({
    id: r.id,
    source: r.source as "faq" | "db",
    category: r.category,
    content: r.content,
  }));
}

async function upsertEmbedding(
  doc: StoredDoc,
  contentHash: string,
  embedding: number[],
): Promise<void> {
  if (isSupabaseAvailable()) {
    await ensurePgTables();
    await pgQuery(
      `INSERT INTO rag_embeddings (id, source, category, content, content_hash, embedding, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET
         source = EXCLUDED.source,
         category = EXCLUDED.category,
         content = EXCLUDED.content,
         content_hash = EXCLUDED.content_hash,
         embedding = EXCLUDED.embedding,
         updated_at = NOW()`,
      [
        doc.id,
        doc.source,
        doc.category,
        doc.content,
        contentHash,
        JSON.stringify(embedding),
      ],
    );
    return;
  }

  const db = getDb();
  ensureSqliteTables();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO rag_embeddings (id, source, category, content, content_hash, embedding, updated_at)
     VALUES (@id, @source, @category, @content, @content_hash, @embedding, @updated_at)
     ON CONFLICT(id) DO UPDATE SET
       content = @content,
       content_hash = @content_hash,
       embedding = @embedding,
       updated_at = @updated_at`,
  ).run({
    id: doc.id,
    source: doc.source,
    category: doc.category,
    content: doc.content,
    content_hash: contentHash,
    embedding: JSON.stringify(embedding),
    updated_at: now,
  });
}

async function writeIndexMeta(key: string, value: string): Promise<void> {
  if (isSupabaseAvailable()) {
    await ensurePgTables();
    await pgQuery(
      `INSERT INTO rag_index_meta (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value],
    );
    return;
  }
  const db = getDb();
  ensureSqliteTables();
  db.prepare(
    `INSERT INTO rag_index_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`,
  ).run(key, value, value);
}

/** Normalise a stored embedding into a number[] regardless of backend. */
function parseStoredEmbedding(value: number[] | string | null): number[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Embedding API (always Zhipu — independent of chat provider order) ──

const ZHIPU_EMBEDDING_URL =
  "https://open.bigmodel.cn/api/paas/v4/embeddings";

const EMBEDDING_TIMEOUT_MS = 2_500;

/**
 * Generate an embedding vector for a text using Zhipu embedding-3.
 * Uses ZHIPU_API_KEY directly so embeddings keep working regardless
 * of which chat provider is primary. Returns null on failure/timeout.
 */
async function createEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.ZHIPU_API_KEY ?? "";
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

    const res = await fetch(ZHIPU_EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "embedding-3",
        input: text.slice(0, 8000), // embedding-3 max input
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[RAG] Embedding API failed: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const embedding: number[] | undefined = data?.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) return null;
    return embedding;
  } catch (err) {
    if (!(err instanceof Error && err.name === "AbortError")) {
      console.warn("[RAG] Embedding API error:", err);
    }
    return null;
  }
}

// ── Query embedding cache (in-memory, 30 min TTL, max 100 entries) ──

const QUERY_CACHE_TTL_MS = 30 * 60 * 1000;
const QUERY_CACHE_MAX = 100;
const queryEmbeddingCache = new Map<string, { vec: number[] | null; at: number }>();

async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const key = query.trim().toLowerCase().slice(0, 200);
  if (!key) return null;

  const cached = queryEmbeddingCache.get(key);
  if (cached && Date.now() - cached.at < QUERY_CACHE_TTL_MS) {
    return cached.vec;
  }

  const vec = await createEmbedding(query);

  if (queryEmbeddingCache.size >= QUERY_CACHE_MAX) {
    // evict oldest
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of queryEmbeddingCache) {
      if (v.at < oldestAt) { oldestAt = v.at; oldestKey = k; }
    }
    if (oldestKey) queryEmbeddingCache.delete(oldestKey);
  }
  queryEmbeddingCache.set(key, { vec, at: Date.now() });
  return vec;
}

// ── Cosine similarity ───────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

// ── Lexical scoring (instant, offline — works bn/en/banglish) ──────

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "am", "i", "me", "my", "we", "you",
  "to", "of", "in", "on", "for", "and", "or", "do", "does", "can",
  "what", "how", "when", "where", "who", "which", "please", "tell",
  "ki", "kothay", "kivabe", "keno", "ami", "apni", "ekhon", "korte",
  "hobe", "chai", "lagbe", "dite", "pari", "parbo",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;.!?()"'`]+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/**
 * Score a document against query tokens: fraction of query tokens
 * found in the document (substring match tolerates morphology and
 * banglish spelling variants).
 */
function lexicalScore(queryTokens: string[], docText: string): number {
  if (queryTokens.length === 0) return 0;
  const hay = docText.toLowerCase();
  let hits = 0;
  for (const t of queryTokens) {
    if (hay.includes(t)) hits++;
  }
  return hits / queryTokens.length;
}

// ── Simple hash for content change detection ────────────────────────

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ── DB snapshot summaries for RAG ───────────────────────────────────

/**
 * Build short text summaries of live DB data to embed alongside FAQ.
 *
 * INVARIANT: these summaries carry COUNTS ONLY. Never include donor
 * names, phone numbers, patient names or any other personal data —
 * `serverGetProfilesByRole` returns full profile rows and it is easy to
 * leak one by accident. Only aggregate over the rows.
 */
async function buildDBSummaries(): Promise<
  { id: string; category: string; content: string }[]
> {
  const summaries: { id: string; category: string; content: string }[] = [];

  try {
    const [inventory, activeReqs, donors] = await Promise.all([
      serverGetBloodInventory() as Promise<{ blood_group: string; count: number }[]>,
      serverGetActiveBloodRequests(50) as Promise<any[]>,
      serverGetProfilesByRole("donor") as Promise<any[]>,
    ]);

    // Inventory summary
    const invText = inventory
      .map((i) => `${i.blood_group}: ${i.count} donors`)
      .join(", ");
    summaries.push({
      id: "db-inventory",
      category: "inventory",
      content: `Current blood donor inventory by group: ${invText}. Total registered donor records: ${donors.length}.`,
    });

    // Active requests summary
    const activeCount = activeReqs.filter((r) => r.status === "active").length;
    const urgentCount = activeReqs.filter(
      (r) => r.urgency_level === "critical" || r.urgency_level === "urgent",
    ).length;
    summaries.push({
      id: "db-requests",
      category: "requests",
      content: `Currently ${activeCount} active blood requests, ${urgentCount} of which are urgent or critical. Requesters can track status using their tracking code.`,
    });

    // District coverage
    const districts = new Set(
      donors.map((d) => d.district).filter(Boolean) as string[],
    );
    summaries.push({
      id: "db-coverage",
      category: "coverage",
      content: `Registered donors across ${districts.size} districts in Rangpur Division: ${[...districts].join(", ")}.`,
    });
  } catch (err) {
    console.warn("[RAG] Failed to build DB summaries:", err);
  }

  return summaries;
}

/**
 * The full in-memory document list (FAQ + DB summaries), used by the
 * lexical retriever. Rebuilt at most once per minute by ensureIndex.
 */
let lexicalDocs: StoredDoc[] = [];

// ── Index management ────────────────────────────────────────────────

let lastIndexCheck = 0;
const INDEX_CHECK_INTERVAL_MS = 60_000; // re-hash docs at most once/min
let indexingPromise: Promise<void> | null = null;

/**
 * Ensure all FAQ documents and DB summaries have embeddings in the
 * database. Only generates new embeddings when content changes
 * (detected via hash). Runs at most once per 60s per process.
 */
async function ensureIndex() {
  const nowMs = Date.now();
  if (nowMs - lastIndexCheck < INDEX_CHECK_INTERVAL_MS) return;
  if (indexingPromise) return indexingPromise;

  indexingPromise = (async () => {
    try {
      // Combine FAQ + live DB summaries
      const dbSummaries = await buildDBSummaries();
      const allDocs: StoredDoc[] = [
        ...FAQ_DOCUMENTS.map((d) => ({
          id: d.id,
          source: "faq" as const,
          category: d.category,
          content: `${d.title_en}\n${d.title_bn}\n${d.content_en}\n${d.content_bn}`,
        })),
        ...dbSummaries.map((s) => ({
          ...s,
          source: "db" as const,
        })),
      ];

      // Refresh in-memory lexical corpus
      lexicalDocs = allDocs;

      // Read stored hashes once, then embed only what changed / is missing
      let storedHashes: Map<string, string>;
      try {
        storedHashes = await readStoredHashes();
      } catch (err) {
        console.warn("[RAG] Could not read stored embeddings:", err);
        lastIndexCheck = Date.now();
        return;
      }

      let embedded = 0;

      for (const doc of allDocs) {
        const hash = simpleHash(doc.content);
        if (storedHashes.get(doc.id) === hash) continue; // up to date

        const embedding = await createEmbedding(doc.content);
        if (!embedding) {
          console.warn(`[RAG] Skipping ${doc.id} — no embedding available`);
          continue;
        }

        try {
          await upsertEmbedding(doc, hash, embedding);
        } catch (err) {
          // Persisting must never break retrieval — keep lexical-only.
          console.warn(`[RAG] Could not persist embedding for ${doc.id}:`, err);
          continue;
        }
        embedded++;

        // Rate limit: Zhipu embedding API allows ~50 req/s, but we add
        // a tiny delay to be safe
        if (embedded % 10 === 0) await new Promise((r) => setTimeout(r, 100));
      }

      try {
        await writeIndexMeta("last_index", new Date().toISOString());
      } catch {
        // non-fatal
      }

      lastIndexCheck = Date.now();
    } finally {
      indexingPromise = null;
    }
  })();

  return indexingPromise;
}

// ── Public API ──────────────────────────────────────────────────────

const RRF_K = 60;

/** Minimum cosine similarity for a semantically-ranked doc to count.
 *  Without a floor, every doc gets a rank contribution and irrelevant
 *  chunks dilute the retrieved context. */
const SEMANTIC_MIN_SCORE = 0.3;

/**
 * Retrieve the top-K most relevant knowledge chunks for a user query
 * using hybrid retrieval:
 *   1. Lexical token-overlap ranking (instant, always available)
 *   2. Semantic embedding ranking (bounded 2.5s timeout, cached)
 *   3. Reciprocal Rank Fusion merge
 *
 * Falls back to pure lexical ranking if embeddings are unavailable.
 *
 * @param query  The user's question (any language)
 * @param topK   Number of chunks to retrieve (default 4)
 */
export async function retrieveContext(
  query: string,
  topK = 4,
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];

  try {
    await ensureIndex();
  } catch (err) {
    console.warn("[RAG] Index build failed:", err);
  }

  // ── Lexical ranking (instant) ──
  const queryTokens = tokenize(query);
  const lexicalRanked = lexicalDocs
    .map((d) => ({ id: d.id, score: lexicalScore(queryTokens, d.content) }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);

  // ── Semantic ranking (bounded, cached, optional) ──
  let semanticRanked: { id: string; score: number }[] = [];
  const queryEmbedding = await getQueryEmbedding(query);
  if (queryEmbedding) {
    try {
      const rows = await readEmbeddingRows();
      semanticRanked = rows
        .map((row) => ({
          id: row.id,
          score: cosineSimilarity(
            queryEmbedding,
            parseStoredEmbedding(row.embedding),
          ),
        }))
        .filter((row) => row.score >= SEMANTIC_MIN_SCORE)
        .sort((a, b) => b.score - a.score);
    } catch (err) {
      console.warn("[RAG] Semantic ranking failed:", err);
    }
  }

  // ── RRF fusion ──
  const fused = new Map<string, number>();
  lexicalRanked.forEach((d, rank) => {
    fused.set(d.id, (fused.get(d.id) ?? 0) + 1 / (RRF_K + rank + 1));
  });
  semanticRanked.forEach((d, rank) => {
    fused.set(d.id, (fused.get(d.id) ?? 0) + 1 / (RRF_K + rank + 1));
  });

  const docById = new Map(lexicalDocs.map((d) => [d.id, d]));
  // lexicalDocs may be empty on very first call before ensureIndex
  // completes — fall back to the stored documents.
  if (docById.size === 0) {
    try {
      for (const r of await readStoredDocs()) {
        docById.set(r.id, r);
      }
    } catch {
      // ignore
    }
  }

  const merged: RetrievedChunk[] = [...fused.entries()]
    .map(([id, score]) => {
      const doc = docById.get(id);
      if (!doc) return null;
      return {
        id: doc.id,
        source: doc.source,
        category: doc.category,
        content: doc.content,
        score,
      } as RetrievedChunk;
    })
    .filter((c): c is RetrievedChunk => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return merged;
}

/**
 * Format retrieved chunks into a text block suitable for injection
 * into an LLM prompt.
 */
export async function formatRetrievedContext(
  chunks: RetrievedChunk[],
): Promise<string> {
  if (chunks.length === 0) return "";
  const parts = chunks.map((c, i) => {
    return `[${i + 1}] (${c.source}/${c.category})\n${c.content}`;
  });
  return "RETRIEVED KNOWLEDGE (from RAG):\n" + parts.join("\n\n") + "\n";
}
