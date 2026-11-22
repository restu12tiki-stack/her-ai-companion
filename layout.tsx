import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "HER",
  title: {
    default: "HER — Nayla · Teman Bicara AI-mu",
    template: "%s · HER",
  },
  description:
    "Ngobrol dengan Nayla — cewek MA 17 tahun, anak OSIS, yang romantis, manja, dan cerewet. Teman bicara AI (Gemini) yang ingat, paham, dan punya kepribadian utuh.",
  manifest: "/manifest.webmanifest",
  keywords: ["AI companion", "pacar AI", "teman bicara", "Gemini AI", "HER", "Nayla"],
  authors: [{ name: "HER Project" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HER",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "HER",
    title: "HER — Nayla · Teman Bicara AI-mu",
    description: "Nayla: cewek MA 17 tahun anak OSIS — romantis, manja, cerewet, dan inget segalanya. Teman bicara AI bertenaga Gemini.",
    images: [{ url: "/images/her-avatar.jpg", width: 512, height: 512, alt: "Nayla — HER" }],
    locale: "id_ID",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#171119" },
  ],
};

const themeInit = `(function(){try{var t=localStorage.getItem('her-theme');var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="her-bg text-stone-800 antialiased dark:text-rose-50">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
