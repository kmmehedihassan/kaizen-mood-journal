// src/components/quotes/QuoteExplorer.tsx
"use client";

import { useMemo, useState } from "react";
import { QuoteCard } from "@/components/QuoteCard";
import { CATEGORIES, CATEGORY_MAP, isCategory, type Quote, type QuoteCategory } from "@/data/quotes";
import { favoritesStore } from "@/lib/journal";
import { useHydrated } from "@/lib/store";

type Tab = QuoteCategory | "all" | "saved";

export function QuoteExplorer({ quotes, initialCategory }: { quotes: Quote[]; initialCategory: Tab }) {
  const [tab, setTab] = useState<Tab>(initialCategory);
  const [q, setQ] = useState("");
  const [seed, setSeed] = useState(0);
  const [spotlight, setSpotlight] = useState<Quote | null>(null);
  const favorites = favoritesStore.use();
  const hydrated = useHydrated();

  const selectTab = (t: Tab) => {
    setTab(t);
    setSpotlight(null);
    // keep the URL shareable without a full navigation
    const url = t === "all" || t === "saved" ? "/quotes" : `/quotes/${t}`;
    window.history.replaceState(null, "", url);
  };

  const list = useMemo(() => {
    const base = tab === "saved" ? favorites : tab === "all" ? quotes : quotes.filter((x) => x.category === tab);
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? base.filter((x) => x.text.toLowerCase().includes(needle) || x.author.toLowerCase().includes(needle))
      : base;
    if (!seed) return filtered;
    // shuffle (Fisher–Yates) when the user asks for it
    const arr = [...filtered];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [tab, q, quotes, favorites, seed]);

  const meta = isCategory(tab) ? CATEGORY_MAP[tab] : null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {meta ? `${meta.emoji} ${meta.label} quotes` : tab === "saved" ? "♥ Saved quotes" : "Quotes for every mood"}
        </h1>
        <p className="text-ink-2">{meta?.description ?? (tab === "saved" ? "The words you wanted to keep." : `${quotes.length} hand-picked quotes across ${CATEGORIES.length} collections.`)}</p>
      </header>

      <div className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Quote collections">
          {[{ id: "all", label: "All", emoji: "✨" }, ...CATEGORIES, { id: "saved", label: `Saved${hydrated && favorites.length ? ` (${favorites.length})` : ""}`, emoji: "♥" }].map((c) => (
            <button
              key={c.id}
              role="tab"
              type="button"
              aria-selected={tab === c.id}
              aria-pressed={tab === c.id}
              className="chip shrink-0"
              onClick={() => selectTab(c.id as Tab)}
            >
              <span aria-hidden>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            className="input"
            placeholder="Search by words or author…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search quotes"
          />
          <button type="button" className="btn btn-ghost shrink-0" onClick={() => setSeed((s) => s + 1)} title="Shuffle">
            🔀 <span className="hidden sm:inline">Shuffle</span>
          </button>
          <button
            type="button"
            className="btn btn-primary shrink-0"
            disabled={!list.length}
            onClick={() => setSpotlight(list[Math.floor(Math.random() * list.length)])}
          >
            🎲 <span className="hidden sm:inline">Surprise me</span>
          </button>
        </div>
      </div>

      {spotlight && (
        <div className="relative">
          <QuoteCard key={spotlight.id + seed} {...spotlight} featured />
          <button type="button" onClick={() => setSpotlight(null)} className="absolute right-3 top-3 text-xs text-muted hover:text-ink" aria-label="Close spotlight">
            ✕
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card p-10 text-center text-ink-2">
          {tab === "saved" ? "Tap ♡ on any quote to save it here." : "No quotes match that search."}
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {list.map((quote, i) => (
            <QuoteCard key={quote.id} {...quote} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}
