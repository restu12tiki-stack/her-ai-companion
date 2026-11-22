import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, memories, emotionState } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { isAiConfigured, GEMINI_MODEL } from "@/lib/ai";
import { stateFromRow, moodLabel } from "@/lib/emotions";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = false;
  let messageCount = 0;
  let memoryCount = 0;
  let mood: string | null = null;

  try {
    const [m] = await db.select({ c: count() }).from(messages);
    const [mem] = await db.select({ c: count() }).from(memories);
    messageCount = m?.c ?? 0;
    memoryCount = mem?.c ?? 0;
    database = true;

    const [emo] = await db.select().from(emotionState).where(eq(emotionState.id, 1)).limit(1);
    if (emo) mood = moodLabel(stateFromRow(emo));
  } catch (err) {
    console.error("[/api/status] database check failed:", err);
  }

  return NextResponse.json({
    app: "HER",
    aiConfigured: isAiConfigured(),
    model: GEMINI_MODEL,
    database,
    messageCount,
    memoryCount,
    mood,
  });
}
