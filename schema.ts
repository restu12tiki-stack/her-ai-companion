import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * HER — skema database
 * Semua tabel memakai prefix `her_` agar aman dipakai bersama aplikasi lain.
 */

// ─── Pesan percakapan ────────────────────────────────────────────────────────
export const messages = pgTable(
  "her_messages",
  {
    id: serial("id").primaryKey(),
    role: text("role").notNull(), // 'user' | 'assistant'
    content: text("content").notNull(),
    // Snapshot suasana hati Nayla saat membalas (opsional, untuk transparansi)
    mood: text("mood"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("her_messages_created_at_idx").on(t.createdAt)]
);

export type Message = typeof messages.$inferSelect;

// ─── Memori jangka panjang ───────────────────────────────────────────────────
export const MEMORY_CATEGORIES = [
  "user_info", // fakta penting tentang user
  "preference", // hal yang disukai/tidak disukai user
  "story", // cerita pribadi yang dibagikan user
  "event", // kejadian penting / momen bersama
  "relationship", // dinamika & tonggak hubungan
  "inside_joke", // lelucon internal berdua
  "milestone", // pencapaian hubungan (pacaran, jadian, dll.)
  "goal", // harapan / rencana user
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const memories = pgTable(
  "her_memories",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(), // MemoryCategory
    content: text("content").notNull(),
    importance: integer("importance").notNull().default(5), // 1 (kecil) – 10 (sangat penting)
    source: text("source").notNull().default("auto"), // 'auto' | 'manual' | 'system'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [
    index("her_memories_category_idx").on(t.category),
    index("her_memories_importance_idx").on(t.importance),
  ]
);

export type Memory = typeof memories.$inferSelect;

// ─── Keadaan emosi internal Nayla (singleton row, id = 1) ────────────────────
export const emotionState = pgTable("her_emotion_state", {
  id: integer("id").primaryKey(),
  happiness: integer("happiness").notNull().default(72),
  affection: integer("affection").notNull().default(74),
  shyness: integer("shyness").notNull().default(48),
  curiosity: integer("curiosity").notNull().default(62),
  jealousy: integer("jealousy").notNull().default(26),
  irritation: integer("irritation").notNull().default(10),
  sadness: integer("sadness").notNull().default(12),
  confidence: integer("confidence").notNull().default(58),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type EmotionState = typeof emotionState.$inferSelect;

export const EMOTION_KEYS = [
  "happiness",
  "affection",
  "shyness",
  "curiosity",
  "jealousy",
  "irritation",
  "sadness",
  "confidence",
] as const;
export type EmotionKey = (typeof EMOTION_KEYS)[number];

export type EmotionDeltas = Partial<Record<EmotionKey, number>>;

// ─── Catatan transparansi: payload emosi mentah tidak pernah dikirim ke user ──
export type EmotionSnapshot = Record<EmotionKey, number>;
