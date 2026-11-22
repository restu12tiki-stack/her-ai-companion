/**
 * HER — Klien Gemini API (REST, server-side saja)
 * Kunci API TIDAK PERNAH dikirim ke browser.
 */

// Default 2026: gemini-3.6-flash (stabil, free-tier, dibuka untuk proyek baru).
// Alternatif via GEMINI_MODEL: gemini-3.8-flash · gemini-3.5-flash-lite · gemini-2.5-flash (lama).
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

// Opsional: override base URL (untuk proxy / pengujian terisolasi).
const API_BASE =
  process.env.GEMINI_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://generativelanguage.googleapis.com";

export function isAiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key.length >= 10);
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY belum dikonfigurasi di server.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

interface GenerateParams {
  systemInstruction: string;
  contents: ChatTurn[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

/**
 * Memanggil :generateContent Gemini dan mengembalikan teks mentah kandidat pertama.
 * Melempar AiRequestError kalau gagal — pemanggil WAJIB menangani error ini
 * (tidak boleh ada respons palsu yang menyamar sebagai AI).
 */
export async function generateText({
  systemInstruction,
  contents,
  temperature = 0.95,
  topP = 0.95,
  maxOutputTokens = 1100,
  jsonMode = true,
  timeoutMs = 30_000,
}: GenerateParams): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiNotConfiguredError();

  const url = `${API_BASE}/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent`;

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: contents.map((c) => ({
      role: c.role,
      parts: [{ text: c.text }],
    })),
    generationConfig: {
      temperature,
      topP,
      maxOutputTokens,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new AiRequestError(
      aborted
        ? "Koneksi ke Gemini timeout. Coba lagi sebentar lagi."
        : "Tidak bisa terhubung ke server Gemini. Periksa koneksi internet.",
      aborted ? 504 : 502
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const errJson = (await res.json()) as {
        error?: { message?: string };
      };
      detail = errJson?.error?.message ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new AiRequestError(
        "API key Gemini ditolak. Periksa GEMINI_API_KEY di environment server.",
        res.status
      );
    }
    if (res.status === 429) {
      throw new AiRequestError(
        "Kuota/batas permintaan Gemini tercapai. Tunggu sebentar lalu coba lagi.",
        429
      );
    }
    throw new AiRequestError(
      `Gemini mengembalikan error (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      res.status
    );
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    throw new AiRequestError(
      `Permintaan diblokir filter keamanan Gemini (${data.promptFeedback.blockReason}).`,
      422
    );
  }

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new AiRequestError("Gemini tidak mengembalikan teks (mungkin kena filter).", 502);
  }
  return text;
}

/** Ekstrak objek JSON pertama dari teks (tahan terhadap code-fence liar). */
export function extractJson<T = unknown>(raw: string): T | null {
  let candidate = raw.trim();
  // Buang code fence ```json ... ```
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
