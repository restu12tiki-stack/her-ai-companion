/**
 * HER — Memori jangka panjang
 * Retrieval berbasis relevansi kata kunci + bobot kepentingan.
 * Bukan black-box: semua yang tersimpan bisa diperiksa & dihapus user.
 */

import { db } from "@/db";
import { memories, type Memory } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "itu", "ini", "aku", "kamu", "dia", "kita",
  "mereka", "ada", "gak", "ga", "nggak", "tidak", "udah", "sudah", "aja", "saja",
  "adalah", "untuk", "pada", "dengan", "karena", "juga", "bisa", "mau", "akan",
  "ya", "sih", "nih", "dong", "deh", "kok", "loh", "lah", "nya", "sama", "the",
  "a", "an", "of", "to", "and", "is", "it", "you", "i",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function relevanceScore(memoryContent: string, queryTokens: string[]): number {
  const content = memoryContent.toLowerCase();
  let hits = 0;
  for (const token of new Set(queryTokens)) {
    if (content.includes(token)) hits += 1;
  }
  return hits;
}

export interface ScoredMemory extends Memory {
  score: number;
}

/**
 * Ambil memori paling relevan untuk pesan user.
 * Gabungan: (a) memori yang cocok kata kunci, (b) memori penting sebagai backdrop.
 */
export async function retrieveRelevantMemories(
  userMessage: string,
  limit = 16
): Promise<Memory[]> {
  const all = await db
    .select()
    .from(memories)
    .orderBy(desc(memories.importance), desc(memories.createdAt))
    .limit(220);

  if (all.length === 0) return [];

  const tokens = tokenize(userMessage);
  const scored: ScoredMemory[] = all.map((m) => ({
    ...m,
    score: relevanceScore(m.content, tokens) * 4 + m.importance,
  }));

  const keywordHits = scored
    .filter((m) => relevanceScore(m.content, tokens) > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const backdrop = scored
    .filter((m) => !keywordHits.some((k) => k.id === m.id))
    .sort((a, b) => b.importance - a.importance || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, Math.max(0, limit - keywordHits.length));

  const picked = [...keywordHits, ...backdrop].slice(0, limit);

  // Tandai memori yang dipakai (best-effort, jangan gagalkan chat jika gagal)
  if (picked.length > 0) {
    const ids = picked.map((m) => m.id);
    void (async () => {
      try {
        await db
          .update(memories)
          .set({ lastUsedAt: new Date() })
          .where(sql`${memories.id} = ANY(${ids})`);
      } catch {
        /* abaikan — ini hanya statistik pemakaian */
      }
    })();
  }

  return picked;
}

/** Cegah duplikasi naif: lewati jika ada memori yang isinya mirip. */
export async function insertMemoryIfUnique(
  category: string,
  content: string,
  importance: number,
  source: "auto" | "manual" | "system" = "auto"
): Promise<boolean> {
  const normalized = content.trim().toLowerCase();
  if (normalized.length < 8) return false;

  const existing = await db
    .select({ id: memories.id, content: memories.content })
    .from(memories)
    .orderBy(desc(memories.createdAt))
    .limit(300);

  const duplicate = existing.some((m) => {
    const a = m.content.toLowerCase().trim();
    return a === normalized || a.includes(normalized) || normalized.includes(a);
  });
  if (duplicate) return false;

  await db.insert(memories).values({
    category,
    content: content.trim(),
    importance: Math.max(1, Math.min(10, Math.round(importance))),
    source,
  });

  // Pruning halus: kalau memori menumpuk > 180, hapus yang paling tidak penting & paling lama
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memories);
  if (count > 180) {
    await db.execute(sql`
      DELETE FROM her_memories
      WHERE id IN (
        SELECT id FROM her_memories
        ORDER BY importance ASC, created_at ASC
        LIMIT ${count - 180}
      )
    `);
  }

  return true;
}
