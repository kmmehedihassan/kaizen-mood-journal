// src/components/insights/InsightsClient.tsx
"use client";

import Link from "next/link";
import { useRef } from "react";
import { TrendChart } from "@/components/insights/TrendChart";
import { WeeklyReviewCard } from "@/components/insights/WeeklyReviewCard";
import { toast } from "@/components/Toaster";
import {
  byDay,
  clearJournal,
  completedActionsStore,
  dayValence,
  exportJournal,
  importJournal,
  journalStore,
  seedDemoData,
  streaks,
} from "@/lib/journal";
import { MOODS, MOOD_MAP } from "@/lib/moods";
import { WEEKDAYS, lastNDays, parseDayKey, formatDay } from "@/lib/dates";
import { useHydrated } from "@/lib/store";

function Stat({ label, value, hint, emoji }: { label: string; value: string; hint?: string; emoji: string }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        <span aria-hidden>{emoji}</span> {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-2">{hint}</p>}
    </div>
  );
}

const describe = (v: number) =>
  v > 1.2 ? "Great" : v > 0.4 ? "Good" : v > -0.4 ? "Okay" : v > -1.2 ? "Low" : "Rough";

export function InsightsClient() {
  const hydrated = useHydrated();
  const entries = journalStore.use();
  const actions = completedActionsStore.use();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) return <div className="card h-[32rem] animate-pulse" />;

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-5 py-10 text-center">
        <p className="text-6xl" aria-hidden>📈</p>
        <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
        <p className="text-ink-2">
          Once you&apos;ve logged a few check-ins, this page reveals your patterns: your mood trend, your best days of the week, and which
          habits seem to lift you up.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/journal" className="btn btn-primary">Start journaling</Link>
          <button type="button" className="btn btn-ghost" onClick={() => toast(`Planted ${seedDemoData()} demo check-ins`, "🌷")}>
            Explore with sample data
          </button>
        </div>
      </div>
    );
  }

  const days = byDay(entries);
  const s = streaks(entries);
  const compound = Math.pow(1.01, s.totalDays);
  const actionCount = Object.values(actions).reduce((n, a) => n + a.length, 0);

  // Trend (30 days)
  const trend = lastNDays(30).map((k) => {
    const list = days.get(k) ?? [];
    const v = dayValence(list);
    const moods = [...new Set(list.map((e) => `${MOOD_MAP[e.mood].emoji} ${MOOD_MAP[e.mood].label}`))].join(", ");
    return { day: k, value: v, label: v === null ? undefined : `${describe(v)} · ${moods}` };
  });

  // Mood mix
  const counts = MOODS.map((m) => ({ m, n: entries.filter((e) => e.mood === m.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxCount = Math.max(...counts.map((c) => c.n));

  // Weekday rhythm
  const weekday = WEEKDAYS.map((label, i) => {
    const vals = [...days.entries()].filter(([k]) => parseDayKey(k).getDay() === i).map(([, l]) => dayValence(l)!);
    return { label, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, n: vals.length };
  });
  const scored = weekday.filter((w) => w.avg !== null) as { label: string; avg: number; n: number }[];
  const best = scored.length ? scored.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;

  // Tag impact: average valence of entries with tag vs overall
  const overall = entries.reduce((a, e) => a + MOOD_MAP[e.mood].valence, 0) / entries.length;
  const tagStats = [...new Set(entries.flatMap((e) => e.tags))]
    .map((tag) => {
      const withTag = entries.filter((e) => e.tags.includes(tag));
      const avg = withTag.reduce((a, e) => a + MOOD_MAP[e.mood].valence, 0) / withTag.length;
      return { tag, n: withTag.length, delta: avg - overall };
    })
    .filter((t) => t.n >= 2)
    .sort((a, b) => b.delta - a.delta);
  const lifts = tagStats.filter((t) => t.delta > 0.15).slice(0, 4);
  const drains = tagStats.filter((t) => t.delta < -0.15).slice(-4).reverse();

  const gratitude = entries.filter((e) => e.gratitude).slice(0, 8);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
        <p className="mt-1 text-ink-2">Patterns from {entries.length} check-ins — calculated privately in your browser.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
        <Stat emoji="🔥" label="Current streak" value={`${s.current}d`} hint={s.journaledToday ? "Checked in today ✓" : "Check in today to keep it"} />
        <Stat emoji="🏔️" label="Longest streak" value={`${s.longest}d`} />
        <Stat emoji="🌱" label="Kaizen growth" value={`${compound.toFixed(2)}×`} hint={`1% better × ${s.totalDays} days tended`} />
        <Stat emoji="✅" label="Tiny steps taken" value={String(actionCount)} hint="1% actions completed" />
      </section>

      <WeeklyReviewCard />

      <section className="card space-y-3 p-5" aria-labelledby="trend-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="trend-h" className="font-semibold">Mood over the last 30 days</h2>
          <p className="text-xs text-muted">Daily average, weighted by intensity</p>
        </div>
        <TrendChart points={trend} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4 p-5" aria-labelledby="mix-h">
          <h2 id="mix-h" className="font-semibold">Mood mix</h2>
          <ul className="space-y-2.5">
            {counts.map(({ m, n }) => (
              <li key={m.id} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="truncate text-ink-2">{m.emoji} {m.label}</span>
                <span className="h-2.5 rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${(n / maxCount) * 100}%`, background: `hsl(${m.hue} 70% 58%)` }}
                  />
                </span>
                <span className="text-right tabular-nums text-ink-2">{n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="week-h">
          <div className="flex items-baseline justify-between">
            <h2 id="week-h" className="font-semibold">Weekly rhythm</h2>
            {best && <p className="text-xs text-muted">Best day: <strong className="text-ink">{best.label}</strong></p>}
          </div>
          <div className="grid h-40 grid-cols-7 items-center gap-2">
            {weekday.map((w) => {
              const pct = w.avg === null ? 0 : (Math.abs(w.avg) / 2) * 50;
              const up = (w.avg ?? 0) >= 0;
              return (
                <div key={w.label} className="relative flex h-full flex-col items-center" title={w.avg === null ? "No data" : `${describe(w.avg)} (${w.n} days)`}>
                  <div className="relative w-full flex-1">
                    <div className="absolute inset-x-0 top-1/2 border-t border-line" />
                    {w.avg !== null && (
                      <div
                        className="absolute left-1/2 w-3/5 max-w-6 -translate-x-1/2 rounded-[4px]"
                        style={{
                          height: `${Math.max(pct, 2)}%`,
                          ...(up ? { bottom: "50%" } : { top: "50%" }),
                          background: up ? "var(--accent)" : "oklch(0.65 0.12 40)",
                        }}
                      />
                    )}
                  </div>
                  <span className="mt-1 text-xs text-muted">{w.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted">Above the line = more pleasant days, below = harder ones.</p>
        </section>
      </div>

      <section className="card space-y-4 p-5" aria-labelledby="tags-h">
        <h2 id="tags-h" className="font-semibold">What seems to lift you — and what drains you</h2>
        {tagStats.length === 0 ? (
          <p className="text-sm text-ink-2">Add tags like <em>#exercise</em> or <em>#work</em> to your check-ins and Kaizen will spot patterns here.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { title: "🌞 Lifts", list: lifts, empty: "No clear lifts yet." },
              { title: "🌧️ Drains", list: drains, empty: "Nothing stands out as draining. 🎉" },
            ].map((col) => (
              <div key={col.title}>
                <h3 className="mb-2 text-sm font-medium text-ink-2">{col.title}</h3>
                {col.list.length ? (
                  <ul className="space-y-2">
                    {col.list.map((t) => (
                      <li key={t.tag} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
                        <span>#{t.tag} <span className="text-xs text-muted">({t.n})</span></span>
                        <span className="font-semibold tabular-nums">{t.delta > 0 ? "+" : ""}{t.delta.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{col.empty}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">Score = how much more (or less) pleasant your mood is on entries with that tag, compared with your average. Correlation, not causation.</p>
      </section>

      {gratitude.length > 0 && (
        <section className="space-y-3" aria-labelledby="grat-h">
          <h2 id="grat-h" className="text-xl font-semibold tracking-tight">Gratitude wall</h2>
          <ul className="columns-1 gap-3 sm:columns-2 lg:columns-3">
            {gratitude.map((e) => (
              <li key={e.id} className="card mb-3 break-inside-avoid p-4">
                <p className="quote-text italic">“{e.gratitude}”</p>
                <p className="mt-2 text-xs text-muted">{formatDay(e.day)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5" aria-labelledby="data-h">
        <div>
          <h2 id="data-h" className="font-semibold">Your data</h2>
          <p className="text-sm text-ink-2">Stored only in this browser. Back it up or move it to another device.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => exportJournal(entries)}>⤓ Export</button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>⤒ Import</button>
          <button
            type="button"
            className="btn btn-ghost text-rose-600"
            onClick={() => {
              if (confirm("Delete all journal entries from this browser? This can't be undone.")) {
                clearJournal();
                toast("Journal cleared", "🧹");
              }
            }}
          >
            Clear all
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const n = importJournal(await f.text());
                toast(`Imported ${n} new entr${n === 1 ? "y" : "ies"}`, "📥");
              } catch {
                toast("That file doesn't look like a Kaizen export", "⚠️");
              }
              e.target.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}
