// src/components/home/CheckIn.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MoodPicker } from "@/components/MoodPicker";
import { QuoteCard } from "@/components/QuoteCard";
import { toast } from "@/components/Toaster";
import { MOOD_MAP, type MoodId } from "@/lib/moods";
import { QUOTES } from "@/data/quotes";
import { addEntry, completedActionsStore, currentMoodStore, journalStore, streaks, toggleAction } from "@/lib/journal";
import { dayKey, timeOfDayGreeting } from "@/lib/dates";
import { useHydrated } from "@/lib/store";

export function CheckIn() {
  const hydrated = useHydrated();
  const entries = journalStore.use();
  const done = completedActionsStore.use();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [shuffle, setShuffle] = useState(0);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => setGreeting(timeOfDayGreeting()), []);

  const { journaledToday, current } = streaks(entries);
  const today = dayKey();
  const m = mood ? MOOD_MAP[mood] : null;

  const quote = useMemo(() => {
    if (!m) return null;
    const pool = QUOTES.filter((q) => m.categories.slice(0, 2).includes(q.category as never));
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, shuffle]);

  const choose = (id: MoodId) => {
    setMood(id);
    currentMoodStore.set(id);
  };

  const quickSave = () => {
    if (!mood) return;
    addEntry({ mood, intensity: 3, note: "", tags: [] });
    toast(current > 0 && !journaledToday ? `Checked in — ${current + 1} day streak!` : "Checked in. A flower was planted 🌷", "✅");
  };

  return (
    <section aria-labelledby="checkin-heading" className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-accent-ink">{greeting} 🌱</p>
          <h1 id="checkin-heading" className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            How are you <span className="quote-text italic text-accent-ink">really</span> feeling?
          </h1>
          <p className="max-w-lg text-ink-2">
            Pick a mood. Kaizen will meet you there with words that fit and one tiny step to feel 1% better.
          </p>
        </div>
        <MoodPicker value={mood} onChange={choose} />
        {hydrated && journaledToday && !mood && (
          <p className="text-sm text-muted">✅ You&apos;ve checked in today. Feel free to check in again — moods change.</p>
        )}
      </div>

      <div className="min-h-[22rem]" aria-live="polite">
        {m && quote ? (
          <div key={m.id} className="space-y-4">
            <div className="card animate-rise space-y-4 p-5">
              <p className="flex items-start gap-3 text-ink">
                <span className="text-3xl" aria-hidden>{m.emoji}</span>
                <span className="pt-1">{m.note}</span>
              </p>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Your 1% for right now</p>
                <ul className="space-y-1.5">
                  {m.actions.map((a) => {
                    const checked = (done[today] ?? []).includes(a);
                    return (
                      <li key={a}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl p-1.5 text-sm hover:bg-surface-2">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                            checked={checked}
                            onChange={() => {
                              toggleAction(today, a);
                              if (!checked) toast("Nice. That's your 1% today.", "🌱");
                            }}
                          />
                          <span className={checked ? "text-muted line-through" : "text-ink-2"}>{a}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className="btn btn-primary" onClick={quickSave}>Save check-in</button>
                <Link href={`/journal?mood=${m.id}`} className="btn btn-ghost">Write more</Link>
                {m.helper && <Link href={m.helper.href} className="btn btn-ghost">{m.helper.label}</Link>}
              </div>
            </div>
            <QuoteCard {...quote} />
            <button type="button" className="text-sm font-medium text-muted hover:text-ink" onClick={() => setShuffle((s) => s + 1)}>
              ↻ Another quote
            </button>
          </div>
        ) : (
          <div className="card grid h-full min-h-[22rem] place-items-center p-8 text-center">
            <div className="space-y-3">
              <div className="animate-float text-6xl" aria-hidden>🪷</div>
              <p className="quote-text text-xl italic text-ink-2">“Little by little, one travels far.”</p>
              <p className="text-sm text-muted">— J. R. R. Tolkien</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
