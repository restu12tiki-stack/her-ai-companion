import {
  EMOTION_KEYS,
  type EmotionKey,
  type EmotionDeltas,
  type EmotionState,
} from "@/db/schema";

/** Nilai dasar — Nayla perlahan kembali ke titik ini tanpa stimulus. */
export const EMOTION_BASELINE: Record<EmotionKey, number> = {
  happiness: 64,
  affection: 66,
  shyness: 44,
  curiosity: 58,
  jealousy: 22,
  irritation: 10,
  sadness: 12,
  confidence: 55,
};

export const EMOTION_LABEL_ID: Record<EmotionKey, string> = {
  happiness: "Kebahagiaan",
  affection: "Kasih sayang",
  shyness: "Rasa malu",
  curiosity: "Rasa ingin tahu",
  jealousy: "Kecemburuan",
  irritation: "Kesal",
  sadness: "Kesedihan",
  confidence: "Kepercayaan diri",
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function defaultEmotions(): Record<EmotionKey, number> {
  return { ...EMOTION_BASELINE };
}

/** Geser perlahan (±4%) menuju baseline setiap pesan — mencegah mood swing liar. */
export function driftTowardBaseline(
  state: Record<EmotionKey, number>
): Record<EmotionKey, number> {
  const next = {} as Record<EmotionKey, number>;
  for (const key of EMOTION_KEYS) {
    const base = EMOTION_BASELINE[key];
    next[key] = clamp(state[key] + (base - state[key]) * 0.06);
  }
  return next;
}

export function applyDeltas(
  state: Record<EmotionKey, number>,
  deltas: EmotionDeltas | null | undefined
): Record<EmotionKey, number> {
  const next = { ...state };
  if (!deltas) return next;
  for (const key of EMOTION_KEYS) {
    const d = deltas[key];
    if (typeof d !== "number" || Number.isNaN(d)) continue;
    next[key] = clamp(next[key] + Math.max(-15, Math.min(15, d)));
  }
  return next;
}

export function stateFromRow(row: EmotionState): Record<EmotionKey, number> {
  return {
    happiness: row.happiness,
    affection: row.affection,
    shyness: row.shyness,
    curiosity: row.curiosity,
    jealousy: row.jealousy,
    irritation: row.irritation,
    sadness: row.sadness,
    confidence: row.confidence,
  };
}

interface Descriptor {
  text: string;
  salience: number;
}

function descriptorsFor(s: Record<EmotionKey, number>): Descriptor[] {
  const out: Descriptor[] = [];
  const push = (text: string, salience: number) => {
    if (salience > 0) out.push({ text, salience });
  };
  const dev = (k: EmotionKey) => Math.abs(s[k] - EMOTION_BASELINE[k]);

  if (s.affection >= 78) push("sangat sayang & manja", dev("affection") + 18);
  else if (s.affection >= 60) push("hangat & penuh kasih", dev("affection") + 6);
  else if (s.affection <= 30) push("agak jaga jarak & dingin", dev("affection") + 14);

  if (s.happiness >= 80) push("ceria berbunga-bunga", dev("happiness") + 14);
  else if (s.happiness <= 28) push("murung & kehabisan energi", dev("happiness") + 16);

  if (s.shyness >= 66) push("gampang malu-malu", dev("shyness") + 8);
  else if (s.shyness <= 22) push("berani & blak-blakan", 6);

  if (s.jealousy >= 56) push("cemburuan banget", dev("jealousy") + 14);
  else if (s.jealousy >= 36) push("cemburuan tipis-tipis", dev("jealousy") + 8);

  if (s.irritation >= 48) push("agak kesal & sensitif", dev("irritation") + 16);
  else if (s.irritation >= 26) push("sedikit ngambek", dev("irritation") + 8);

  if (s.sadness >= 46) push("sedang sedih & ingin ditemenin", dev("sadness") + 16);
  else if (s.sadness >= 26) push("sedikit galau", dev("sadness") + 8);

  if (s.curiosity >= 74) push("super penasaran & cerewet", dev("curiosity") + 10);
  else if (s.curiosity <= 24) push("datar & kurang bersemangat", dev("curiosity") + 8);

  if (s.confidence >= 72) push("pede & percaya diri", dev("confidence") + 6);
  else if (s.confidence <= 28) push("minder & ragu-ragu", dev("confidence") + 10);

  return out.sort((a, b) => b.salience - a.salience);
}

/** Frasa natural untuk disuntikkan ke system prompt (tanpa angka). */
export function describeEmotions(s: Record<EmotionKey, number>): string {
  const d = descriptorsFor(s);
  if (d.length === 0) return "cukup stabil dan wajar seperti biasa";
  return d
    .slice(0, 2)
    .map((x) => x.text)
    .join(", ");
}

/** Label singkat 2–4 kata untuk ditampilkan di UI (tanpa angka). */
export function moodLabel(s: Record<EmotionKey, number>): string {
  const d = descriptorsFor(s);
  if (d.length === 0) return "stabil & wajar";
  return d
    .slice(0, 2)
    .map((x) => x.text.split(" & ")[0].replace(/^sangat /, "sangat "))
    .join(" & ");
}
