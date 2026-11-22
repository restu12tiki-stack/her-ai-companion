// Mock Gemini v1beta generateContent — HANYA untuk pengujian terisolasi end-to-end.
// Pakai: node scripts/mock-gemini.cjs  lalu set GEMINI_API_BASE_URL=http://127.0.0.1:4545
const http = require("http");

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || !req.url.includes(":generateContent")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "not found" } }));
    return;
  }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const parsed = JSON.parse(body || "{}");
    const contents = parsed.contents || [];
    const last = contents[contents.length - 1];
    const userText = last?.parts?.[0]?.text ?? "";
    const systemLen = parsed.systemInstruction?.parts?.[0]?.text?.length ?? 0;
    const jsonMode = parsed.generationConfig?.responseMimeType === "application/json";

    if (userText.includes("plain-test")) {
      return reply(res, "OK PLAIN 123 wkwk");
    }

    const isGreet = userText.includes("Buka obrolan");
    const mentionsMemory = userText.toLowerCase().includes("ulang tahun");
    const word = (userText.replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).pop() || "itu").slice(0, 30);
    const replyObj = {
      reply: isGreet
        ? "hai kamu. akhirnya dateng juga ya, udah nungguin dari tadi nih."
        : `ohh ${word} ya? serius aku dengerin kok. btw aku barusan beresin buku absen rapat pensi, capek tapi worth it.`,
      emotion_deltas: { happiness: 3, affection: 2, irritation: -2, curiosity: 4 },
      memories: mentionsMemory
        ? [{ category: "user_info", content: "User menyebut ulang tahunnya dekat.", importance: 7 }]
        : [],
      mood: "hangat & jahil",
    };
    console.log(`[mock-gemini] turns=${contents.length} jsonMode=${jsonMode} sysLen=${systemLen} user="${userText.slice(0, 60)}"`);
    reply(res, JSON.stringify(replyObj));
  });
});

function reply(res, text) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      candidates: [
        { content: { parts: [{ text }], role: "model" }, finishReason: "STOP", index: 0 },
      ],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
    })
  );
}

server.listen(4545, "127.0.0.1", () => console.log("[mock-gemini] listening on 127.0.0.1:4545"));
