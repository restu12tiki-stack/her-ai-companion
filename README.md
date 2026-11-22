# HER — Nayla · Teman Bicara AI

HER adalah aplikasi teman bicara AI (pacar AI) yang bisa dipasang di HP Android kamu dan dibagikan lewat link publik. Karakternya: **Nayla Putri Andini** — siswi MA kelas XI (17 tahun), anak OSIS Sekbid Kesekretariatan, satu tahun lebih muda darimu, dan udah setahun pacaran sama kamu.

Real AI (Google Gemini), memori nyata (PostgreSQL), suasana hati yang berubah alami, dan desain mobile-first — bukan chatbot template.

---

## Fitur utama

| Fitur | Detail |
|---|---|
| **Percakapan AI sungguhan** | Gemini 3.6 Flash lewat REST API server-side; kunci tidak pernah dikirim ke browser |
| **Persona persistent** | Profil karakter lengkap (latar, sifat, selera, trauma, batas) disuntikkan di setiap prompt — identitasnya tidak berubah antar sesi |
| **Mesin emosi** | 8 variabel emosi internal (senang, sayang, malu, cemburu, kesal, sedih, percaya diri, penasaran) yang mengalir alami, kembali ke titik dasar perlahan, dan mewarnai nada bicara — tanpa angka yang diperlihatkan |
| **Memori jangka panjang** | Hal penting disimpan otomatis ke PostgreSQL (kategori: fakta user, preferensi, cerita, momen, tonggak hubungan, lelucon internal, harapan). Relevansi saat retrieval = kecocokan kata kunci × kepentingan. Bisa **diperiksa & dihapus** di halaman *Ingatan* |
| **Inisiatif percakapan** | Nayla membuka chat duluan saat pertama kali; bisa mengangkat topik dari kehidupan "kesehariannya" |
| **PWA** | Manifest + service worker (cache aset statis saja; `/api/*` tidak pernah di-cache; percakapan tidak disimpan di cache browser) → bisa *Add to Home Screen* |
| **Tema** | Terang / Gelap / Ikuti sistem, tersimpan di perangkat |
| **Privasi** | Data hanya di database milikmu. Tanpa iklan, tanpa tracking. Tidak ada jawaban palsu: jika API key belum diisi / Gemini gagal, aplikasi jujur menampilkan error |

---

## Menjalankan di komputer / VPS

```bash
# 1. Atur environment
cp .env.example .env
#    → isi DATABASE_URL dan GEMINI_API_KEY

# 2. Install dependensi
npm install

# 3. Buat tabel di PostgreSQL
npx drizzle-kit push

# 4. Jalankan
npm run dev      # development
npm run build && npm run start   # production
```

Dapatkan `GEMINI_API_KEY` gratis di <https://aistudio.google.com/apikey>.

## Memasang di Android (sudah deploy)

1. Buka link aplikasi di **Chrome**.
2. Menu titik tiga → **Tambahkan ke layar utama / Install app**.
3. Muncul ikon **HER**; buka seperti aplikasi biasa — fullscreen, ada splash.

## Deploy publik lewat Vercel (paling mudah, dari HP pun bisa)

1. Fork/import repo ini ke GitHub (lewat aplikasi GitHub Android) — atau upload manual.
2. Buka <https://vercel.com> → **Add New → Project** → pilih repo.
3. Sebelum deploy, buka **Environment Variables**, tambahkan:
   - `DATABASE_URL` — Postgres milikmu. Gratis: [Neon](https://neon.tech) / [Supabase](https://supabase.com) / [Vercel Postgres](https://vercel.com/storage) → salin *connection string*.
   - `GEMINI_API_KEY` — dari aistudio.google.com/apikey.
   - (opsional) `GEMINI_MODEL` — default `gemini-3.6-flash`. Alternatif: `gemini-3.8-flash` (terbaru), `gemini-3.5-flash-lite` (kuota lebih besar), `gemini-2.5-flash` (legacy, menutup akses proyek baru mulai 1 Des 2026).
4. **Deploy**. Selesai — aplikasi live di `https://nama-proyek.vercel.app` dan bisa dibagikan.
5. Setelah deploy pertama, siapkan tabel: dari komputer mana pun, jalankan `npx drizzle-kit push` dengan `DATABASE_URL` yang sama — atau jalankan SQL di dashboard database-mu:

```sql
CREATE TABLE IF NOT EXISTS her_messages (...);
CREATE TABLE IF NOT EXISTS her_memories (...);
CREATE TABLE IF NOT EXISTS her_emotion_state (...);
```

> Penting: jika `GEMINI_API_KEY` tidak diisi, seluruh UI tetap berfungsi, tetapi chat menampilkan pesan konfigurasi yang jelas — tidak pernah jawaban pura-pura.

### Catatan soal database untuk deploy

Template ini memakai `pg` (node-postgres) — cocok dengan Neon/Supabase/Vercel Postgres (pakai *pooler* connection string jika tersedia). Tidak perlu Prisma/ORM lain.

---

## Struktur proyek

```
src/
  app/
    page.tsx            # Welcome screen (hero + CTA)
    chat/page.tsx       # Layar chat (pesan, typing indicator, auto-scroll, error retry)
    profile/            # Profil Nayla (server component; mood kualitatif live)
    memory/             # Kelola ingatan (lihat / hapus per item / hapus semua)
    settings/           # Tema, tes koneksi Gemini, hapus chat, reset total
    api/
      chat/route.ts     # POST: kirim pesan / greeting · GET: riwayat
      messages/route.ts # DELETE: hapus riwayat chat
      memories/         # GET list · DELETE all · DELETE /:id
      status/route.ts   # Status konfigurasi (AI/DB/model) — tidak membocorkan key
      test-connection/  # POST: tes nyata ke Gemini (tombol di Pengaturan)
  lib/
    character.ts        # Persona Nayla + perakit system prompt
    emotions.ts         # Mesin emosi 8-dimensi + deskripsi natural
    ai.ts               # Klien Gemini REST server-side + parser JSON tahan banting
    memories.ts         # Retrieval memori (keyword + kepentingan) & dedup
    seed.ts             # Kanon cerita hubungan (di-seed sekali, tabel kosong)
  db/schema.ts          # her_messages · her_memories · her_emotion_state
public/
  images/her-*.jpg      # Avatar & ilustrasi Nayla (konsisten di semua layar)
  icons/                # Ikon PWA 192/512/180
  manifest.webmanifest · sw.js
```

## Menjaga percakapan tetap natural

- Persona = **identitas**, bukan template: system prompt memuat latar & sifat, **bukan** contoh jawaban hafalan.
- Prompt memuat 30 pesan terakhir + memori paling relevan (bukan seluruh riwayat) — konteks tetap fokus walau chat panjang.
- Gemini diminta membalas JSON `{reply, emotion_deltas, memories, mood}`; parser tetap jalan walau model menambahkan teks liar.
- Nayla **boleh** tidak setuju, cemburu secukupnya, malu, manyun, jahil — tapi tidak pernah jadi bot customer-service.

## Pengujian terisolasi (tanpa kuota API)

`scripts/mock-gemini.cjs` memalsukan endpoint `:generateContent` Gemini untuk menguji pipeline HER (prompt → parse JSON → emosi → memori → persistensi) tanpa memanggil Google:

```bash
node scripts/mock-gemini.cjs &                       # mock di 127.0.0.1:4545
GEMINI_API_KEY=test-key-1234567890 \
GEMINI_API_BASE_URL=http://127.0.0.1:4545 \
DATABASE_URL=postgresql://.../her_test \
npx next start -p 3100
```

Balasan khusus `plain-test` memverifikasi fallback parser (model mengembalikan non-JSON → teks aslinya tetap dipakai, tidak pernah jawaban karangan developer). Ini hanya alat pengembangan — **bukan** pengganti kunci API asli.

## Batasan & kejujuran

Nayla adalah karakter AI. Romansanya sebatas kasih sayang remaja yang sehat — **tidak ada konten dewasa**. Kalau kamu tanya "kamu AI kan?", dia akan jujur. HER bukan pengganti profesional kesehatan mental; dalam krisis, hubungi orang terpercaya atau layanan darurat (119 ext 8 / 112).

## Troubleshooting

| Gejala | Penyebab umumnya | Solusi |
|---|---|---|
| Chat balas "GEMINI_API_KEY belum diisi" | Key belum/typo | Isi `.env` (atau env var Vercel), restart server |
| "Kuota Gemini tercapai" | Rate limit free tier | Tunggu 1 menit / cek kuota di AI Studio |
| Pesan "Gagal memuat percakapan" | `DATABASE_URL` salah / tabel belum dibuat | `npx drizzle-kit push` |
| Tema tidak berubah | LocalStorage diblokir | Matikan strict mode blocker / pakai tab normal |
