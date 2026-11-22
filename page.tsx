"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  SendHorizontal,
  Loader2,
  Brain,
  Heart,
  Settings,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { HER } from "@/lib/character";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  mood?: string | null;
}

interface ChatError {
  message: string;
  retryText: string | null;
}

const SUGGESTIONS = [
  "Hai nay, udah makan belum?",
  "Ceritain kegiatan OSIS-mu hari ini",
  "Lagi galau nih… temenin dong",
];

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <Image
        src={HER.avatar}
        alt={HER.callName}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full border border-rose-100 object-cover dark:border-white/10"
      />
      <div className="glass-soft flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3" aria-label="Nayla sedang mengetik">
        <span className="typing-dot h-2 w-2 rounded-full bg-rose-400" />
        <span className="typing-dot h-2 w-2 rounded-full bg-rose-400" />
        <span className="typing-dot h-2 w-2 rounded-full bg-rose-400" />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ChatError | null>(null);
  const [mood, setMood] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(1);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // ─── Muat riwayat; kalau belum pernah chat, biar Nayla yang membuka ───
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat", { method: "GET" });
        const data = await res.json();
        if (cancelled) return;
        const rows: ChatMessage[] = Array.isArray(data?.messages)
          ? data.messages.map((m: ChatMessage) => ({
              ...m,
              createdAt: m.createdAt,
            }))
          : [];
        setMessages(rows);
        const lastAssistant = [...rows].reverse().find((m) => m.role === "assistant");
        setMood(lastAssistant?.mood ?? null);
        setLoading(false);

        if (rows.length === 0) {
          setSending(true);
          const g = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ greeting: true }),
          });
          const gd = await g.json().catch(() => null);
          if (cancelled) return;
          if (g.ok && gd?.reply) {
            setMessages([
              {
                id: idRef.current++,
                role: "assistant",
                content: gd.reply,
                createdAt: new Date().toISOString(),
                mood: gd.mood ?? null,
              },
            ]);
            setMood(gd.mood ?? null);
          } else {
            setError({
              message: gd?.message ?? "Nayla belum bisa nyapa kamu. Coba lagi ya.",
              retryText: null,
            });
          }
          setSending(false);
        }
      } catch {
        if (!cancelled) {
          setError({ message: "Gagal memuat percakapan. Periksa koneksimu.", retryText: null });
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollToBottom(loading ? "auto" : "smooth");
  }, [messages, sending, loading, scrollToBottom]);

  // ─── Kirim pesan ───
  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || sending) return;

      setError(null);
      setSending(true);
      const optimistic: ChatMessage = {
        id: -idRef.current++,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          // Tidak ada yang tersimpan server-side saat gagal — aman untuk dibatalkan.
          setMessages((m) => m.filter((x) => x.id !== optimistic.id));
          setError({
            message: data?.message ?? "Pesan gagal terkirim. Coba lagi ya.",
            retryText: text,
          });
          setInput(text);
          return;
        }

        setMessages((m) => [
          ...m,
          {
            id: idRef.current++,
            role: "assistant",
            content: data.reply as string,
            createdAt: new Date().toISOString(),
            mood: data.mood ?? null,
          },
        ]);
        setMood(data.mood ?? null);
      } catch {
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        setError({
          message: "Koneksimu terputus. Pesan belum terkirim.",
          retryText: text,
        });
        setInput(text);
      } finally {
        setSending(false);
      }
    },
    [sending]
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  // ─── Divider per-hari ───
  const rendered = useMemo(() => {
    const out: (ChatMessage | { divider: string; key: string })[] = [];
    let lastDay = "";
    for (const msg of messages) {
      const day = new Date(msg.createdAt).toDateString();
      if (day !== lastDay) {
        out.push({ divider: dayLabel(msg.createdAt), key: `divider-${day}-${msg.id}` });
        lastDay = day;
      }
      out.push(msg);
    }
    return out;
  }, [messages]);

  const showEmptyState = !loading && messages.length === 0 && !sending;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* ═══ Header chat ═══ */}
      <header className="z-20 border-b border-rose-100/80 bg-white/75 backdrop-blur-xl dark:border-white/5 dark:bg-[#201623]/85">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4">
          <Link
            href="/"
            aria-label="Kembali ke beranda"
            className="rounded-full p-2 text-stone-500 transition hover:bg-rose-50 hover:text-rose-500 dark:text-rose-100/70 dark:hover:bg-white/5"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="relative shrink-0">
            <Image
              src={HER.avatar}
              alt="Foto profil Nayla"
              width={44}
              height={44}
              priority
              className="h-11 w-11 rounded-full border-2 border-rose-200 object-cover dark:border-rose-400/30"
            />
            <span
              aria-label="Online"
              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-[#201623]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.95rem] font-bold leading-tight text-stone-800 dark:text-rose-50">
              {HER.callName} <span aria-hidden className="text-rose-400">·</span>{" "}
              <span className="text-xs font-semibold text-stone-400 dark:text-rose-100/40">17, XI MIPA 2</span>
            </p>
            <p className="truncate text-[0.68rem] font-semibold leading-tight text-emerald-500 dark:text-emerald-400">
              {sending ? (
                <span className="inline-flex items-center gap-1"><Sparkles size={10} /> mengetik…</span>
              ) : mood ? (
                <span className="text-rose-400/90 dark:text-rose-300/80">online · {mood}</span>
              ) : (
                "online · lagi nyantai"
              )}
            </p>
          </div>

          <Link
            href="/profile"
            aria-label="Profil Nayla"
            title="Profil Nayla"
            className="rounded-full p-2 text-rose-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-white/5"
          >
            <Heart size={20} />
          </Link>
          <Link
            href="/memory"
            aria-label="Ingatan Nayla"
            title="Ingatan Nayla"
            className="hidden rounded-full p-2 text-violet-400 transition hover:bg-violet-50 hover:text-violet-500 dark:hover:bg-white/5 sm:block"
          >
            <Brain size={20} />
          </Link>
          <Link
            href="/settings"
            aria-label="Pengaturan"
            title="Pengaturan"
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/5 dark:hover:text-rose-100"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* ═══ Daftar pesan ═══ */}
      <div className="chat-scroll flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-rose-400" aria-label="Memuat percakapan…" />
            </div>
          )}

          {/* Keadaan kosong */}
          {showEmptyState && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Image
                src={HER.avatar}
                alt={HER.callName}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-xl shadow-rose-200/50 dark:border-white/10"
              />
              <div>
                <p className="font-hand text-3xl text-rose-400">belum ada obrolan…</p>
                <p className="mt-1 max-w-[16rem] text-xs font-medium text-stone-400 dark:text-rose-100/45">
                  Sapa Nayla duluan, atau tunggu dia nyamperin kamu.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-[0.72rem] font-semibold text-rose-500 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 active:scale-[0.97] dark:border-white/10 dark:bg-white/5 dark:text-rose-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pesan-pesan */}
          {rendered.map((item) => {
            if ("divider" in item) {
              return (
                <div key={item.key} className="flex items-center gap-3 py-1.5" aria-hidden>
                  <span className="h-px flex-1 bg-rose-200/60 dark:bg-white/8" />
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-rose-100/35">
                    {item.divider}
                  </span>
                  <span className="h-px flex-1 bg-rose-200/60 dark:bg-white/8" />
                </div>
              );
            }

            const isUser = item.role === "user";
            return (
              <div
                key={item.id}
                className={`animate-msg-in flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}
              >
                {!isUser && (
                  <Image
                    src={HER.avatar}
                    alt=""
                    width={30}
                    height={30}
                    className="h-7 w-7 shrink-0 rounded-full border border-rose-100 object-cover dark:border-white/10"
                  />
                )}
                <div
                  className={`group max-w-[82%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[75%] ${
                    isUser
                      ? "rounded-br-md bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-rose-200/60"
                      : "rounded-bl-md border border-rose-100/80 bg-white/90 text-stone-700 dark:border-white/8 dark:bg-[#2a1f2e]/90 dark:text-rose-50/90"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-[0.92rem] leading-relaxed">
                    {item.content}
                  </p>
                  <p
                    className={`mt-1 text-[0.58rem] font-semibold tabular-nums ${
                      isUser ? "text-right text-white/70" : "text-stone-400 dark:text-rose-100/35"
                    }`}
                  >
                    {timeLabel(item.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}

          {sending && <TypingBubble />}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* ═══ Banner error ═══ */}
      {error && (
        <div role="alert" aria-live="assertive" className="animate-toast-in z-10 border-t border-red-200/60 bg-red-50/95 px-3 py-2 backdrop-blur dark:border-red-400/20 dark:bg-red-950/70">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <AlertCircle size={17} className="shrink-0 text-red-400" />
            <p className="min-w-0 flex-1 text-[0.72rem] font-semibold leading-snug text-red-500 dark:text-red-300">
              {error.message}
            </p>
            {error.retryText && (
              <button
                onClick={() => sendMessage(error.retryText!)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-400/90 px-3 py-1.5 text-[0.68rem] font-bold text-white transition hover:bg-red-500 active:scale-95"
              >
                <RefreshCw size={12} /> Coba lagi
              </button>
            )}
            <button
              onClick={() => setError(null)}
              aria-label="Tutup pesan error"
              className="shrink-0 rounded-full p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-400/10"
            >
              <span aria-hidden className="text-base leading-none">×</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ Input ═══ */}
      <form
        onSubmit={onSubmit}
        className="z-20 border-t border-rose-100/80 bg-white/80 pb-[max(env(safe-area-inset-bottom),0.55rem)] pt-2 backdrop-blur-xl dark:border-white/5 dark:bg-[#201623]/90"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 px-3 sm:px-4">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={2000}
              enterKeyHint="send"
              autoComplete="off"
              placeholder="Ketik pesanmu untuk Nayla…"
              aria-label="Pesan untuk Nayla"
              className="max-h-[9rem] w-full resize-none rounded-3xl border border-rose-200/80 bg-rose-50/50 px-4 py-3 text-[0.95rem] leading-snug text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-white/5 dark:text-rose-50 dark:placeholder:text-rose-100/30 dark:focus:bg-white/8 dark:focus:ring-rose-400/20"
            />
            {input.length > 1700 && (
              <span className="pointer-events-none absolute bottom-3 right-4 text-[0.6rem] font-bold tabular-nums text-stone-400">
                {2000 - input.length}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={sending || input.trim().length === 0}
            aria-label="Kirim pesan"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-300/60 transition-all duration-150 hover:shadow-xl active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {sending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <SendHorizontal size={20} className="-translate-x-[1px] translate-y-[1px]" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
