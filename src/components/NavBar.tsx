// src/components/NavBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { journalStore, streaks } from "@/lib/journal";
import { useHydrated } from "@/lib/store";

const LINKS = [
  { href: "/journal", label: "Journal", emoji: "📓" },
  { href: "/garden", label: "Garden", emoji: "🌷" },
  { href: "/insights", label: "Insights", emoji: "📈" },
  { href: "/breathe", label: "Breathe", emoji: "🫧" },
  { href: "/quotes", label: "Quotes", emoji: "💬" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const entries = journalStore.use();
  const hydrated = useHydrated();
  const { current } = streaks(entries);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-lg" aria-hidden>🌱</span>
          <span className="text-lg">Kaizen</span>
        </Link>

        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive(l.href) ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          {hydrated && current > 0 && (
            <Link
              href="/insights"
              className="chip animate-pop"
              title={`${current}-day check-in streak`}
              aria-label={`${current} day streak`}
            >
              🔥 <span className="tabular-nums">{current}</span>
            </Link>
          )}
          <ThemeToggle />
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-line md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </nav>

      {open && (
        <ul id="mobile-nav" className="animate-rise grid grid-cols-2 gap-2 border-t border-line px-4 py-4 md:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`card flex items-center gap-2 px-4 py-3 text-sm font-medium ${isActive(l.href) ? "text-accent-ink" : ""}`}
              >
                <span aria-hidden>{l.emoji}</span> {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
