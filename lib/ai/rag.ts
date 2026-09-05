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
 * Embeddings are cached in SQLite so we only pay for embedding
 * generation once per document. Query embeddings are cached in
 * memory (30 min TTL). The FAQ index is built lazily, refreshed
 * when content changes, and re-checked at most once per minute.
 */

import { getDb } from "@/lib/db";
import { FAQ_DOCUMENTS } from "./faq-content";
import {
  getBloodInventory,
  getActiveBloodRequests,
  getProfilesByRole,
} from "@/lib/db";

// ── Types ───────────────────────────────────────────────────────────

export interface RetrievedChunk {
  id: string;
  source: "faq" | "db";
  category: string;
  content: string;
  score: number; // fused RRF score (higher = better)
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

function ensureTables() {
  const db = getDb();
  db.exec(EMBEDDINGS_TABLE);
  db.exec(INDEX_HASH_TABLE);
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
 * These give the RAG system awareness of current inventory, donor
 * counts, and active requests without exposing private data.
 */
function buildDBSummaries(): { id: string; category: string; content: string }[] {
  const summaries: { id: string; category: string; content: string }[] = [];

  try {
    const inventory = getBloodInventory();
    const activeReqs = getActiveBloodRequests(50) as any[];
    const donors = getProfilesByRole("donor") as any[];

    // Inventory summary
    const invText = inventory
      .map((i) => `${i.blood_group}: ${i.count} donors`)
      .join(", ");
    summaries.push({
      id: "db-inventory",
      category: "inventory",
      content: `Current blood donor inventory by group: ${invText}. Total active donors: ${donors.length}.`,
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
    const districts = new Set(donors.map((d) => d.district).filter(Boolean));
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
let lexicalDocs: { id: string; source: "faq" | "db"; category: string; content: string }[] = [];

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
      ensureTables();
      const db = getDb();

      // Combine FAQ + DB summaries
      const dbSummaries = buildDBSummaries();
      const allDocs: { id: string; source: "faq" | "db"; category: string; content: string }[] = [
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
      lexicalDocs = allDocs.map((d) => ({
        id: d.id,
        source: d.source,
        category: d.category,
        content: d.content,
      }));

      // Check which docs need (re)embedding
      const stmt = db.prepare(
        "SELECT id, content_hash FROM rag_embeddings WHERE id = ?",
      );
      const upsert = db.prepare(
        `INSERT INTO rag_embeddings (id, source, category, content, content_hash, embedding, updated_at)
         VALUES (@id, @source, @category, @content, @content_hash, @embedding, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           content = @content,
           content_hash = @content_hash,
           embedding = @embedding,
           updated_at = @updated_at`,
      );

      const now = new Date().toISOString();
      let embedded = 0;

      for (const doc of allDocs) {
        const hash = simpleHash(doc.content);
        const existing = stmt.get(doc.id) as { content_hash: string } | undefined;

        if (existing && existing.content_hash === hash) continue; // up to date

        const embedding = await createEmbedding(doc.content);
        if (!embedding) {
          console.warn(`[RAG] Skipping ${doc.id} — no embedding available`);
          continue;
        }

        upsert.run({
          id: doc.id,
          source: doc.source,
          category: doc.category,
          content: doc.content,
          content_hash: hash,
          embedding: JSON.stringify(embedding),
          updated_at: now,
        });
        embedded++;

        // Rate limit: Zhipu embedding API allows ~50 req/s, but we add
        // a tiny delay to be safe
        if (embedded % 10 === 0) await new Promise((r) => setTimeout(r, 100));
      }

      // Record last index time
      db.prepare(
        `INSERT INTO rag_index_meta (key, value) VALUES ('last_index', ?)
         ON CONFLICT(key) DO UPDATE SET value = ?`,
      ).run(now, now);

      lastIndexCheck = Date.now();
    } finally {
      indexingPromise = null;
    }
  })();

  return indexingPromise;
}

// ── Public API ──────────────────────────────────────────────────────

const RRF_K = 60;

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
      const db = getDb();
      const rows = db.prepare(
        "SELECT id, embedding FROM rag_embeddings",
      ).all() as { id: string; embedding: string }[];

      semanticRanked = rows
        .map((row) => {
          let embedding: number[];
          try {
            embedding = JSON.parse(row.embedding);
          } catch {
            embedding = [];
          }
          return { id: row.id, score: cosineSimilarity(queryEmbedding, embedding) };
        })
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
  // completes — fall back to reading stored contents from SQLite.
  if (docById.size === 0) {
    try {
      const db = getDb();
      const rows = db.prepare(
        "SELECT id, source, category, content FROM rag_embeddings",
      ).all() as { id: string; source: string; category: string; content: string }[];
      for (const r of rows) {
        docById.set(r.id, {
          id: r.id,
          source: r.source as "faq" | "db",
          category: r.category,
          content: r.content,
        });
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
