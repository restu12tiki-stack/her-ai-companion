"use client";

import { useEffect } from "react";

/**
 * Registrasi service worker HER.
 * Tidak meng-cache /api/* maupun percakapan — hanya aset statis (lihat public/sw.js).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Jangan daftarkan di lingkungan development supaya tidak mengganggu hot-reload.
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW gagal daftar? App tetap berjalan normal — hanya offline-cache yang tidak aktif.
    });
  }, []);
  return null;
}
