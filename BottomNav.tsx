"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessagesCircle, Heart, Brain, Settings } from "lucide-react";

const ITEMS = [
  { href: "/chat", label: "Chat", icon: MessagesCircle },
  { href: "/profile", label: "Nayla", icon: Heart },
  { href: "/memory", label: "Ingatan", icon: Brain },
  { href: "/settings", label: "Atur", icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div className="glass pointer-events-auto mx-4 flex w-full max-w-md items-center justify-between gap-1 rounded-3xl px-3 py-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 transition-all duration-200 ${
                active
                  ? "bg-rose-400/90 text-white shadow-[0_8px_20px_-6px_rgba(236,112,150,0.7)] dark:bg-rose-400"
                  : "text-stone-500 hover:bg-rose-100/70 hover:text-rose-500 dark:text-rose-100/60 dark:hover:bg-white/5"
              }`}
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "fill-white/20" : "transition-transform duration-200 group-hover:-translate-y-0.5"}
              />
              <span className="text-[0.65rem] font-bold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
