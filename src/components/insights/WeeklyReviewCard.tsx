// src/components/insights/WeeklyReviewCard.tsx
"use client";

import { useState } from "react";
import { createLocalStore } from "@/lib/store";
import { journalStore } from "@/lib/journal";
import { summarizeWeek } from "@/lib/weekly";
import { formatDay } from "@/lib/dates";
import { toast } from "@/components/Toaster";

type Saved = { text: string; source: "ai" | "builtin"; at: number; checkIns: number };
const reviewStore = createLocalStore<Record<string, Saved>>("kaizen.weeklyReviews.v1", {});

export function WeeklyReviewCard() {
  const entries = journalStore.use();
  const reviews = reviewStore.use();
  const [loading, setLoading] = useState(false);
  const summary = summarizeWeek(entries);
  const saved = reviews[summary.end];
  const stale = saved && saved.checkIns !== summary.checkIns;

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
      const data = (await res.json()) as { review?: string; source?: "ai" | "builtin"; error?: string };
      if (!res.ok || !data.review) throw new Error(data.error);
      reviewStore.set((prev) => {
        const next = { ...prev, [summary.end]: { text: data.review!, source: data.source ?? "builtin", at: Date.now(), checkIns: summary.checkIns } };
        // keep the 8 most recent weeks
        return Object.fromEntries(Object.entries(next).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8));
      });
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Couldn't write your review right now", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card relative overflow-hidden p-5" aria-labelledby="weekly-h">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "var(--glow-a)" }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="weekly-h" className="font-semibold">✨ Your week in review</h2>
          <p className="text-xs text-muted">
            {formatDay(summary.start, { month: "short", day: "numeric" })} – {formatDay(summary.end, { month: "short", day: "numeric" })} ·{" "}
            {summary.checkIns} check-ins
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={generate} disabled={loading}>
          {loading ? "Reflecting…" : saved ? (stale ? "↻ Update with new check-ins" : "↻ Regenerate") : "Write my review"}
        </button>
      </div>
      {saved ? (
        <div className="relative mt-4 space-y-2">
          <p className="quote-text text-lg leading-relaxed">{saved.text}</p>
          <p className="text-xs text-muted">
            {saved.source === "ai" ? "Written by Kaizen's AI from a summary of your week" : "Kaizen's built-in review"} · only a
            summary is sent, nothing is stored
          </p>
        </div>
      ) : (
        <p className="relative mt-3 text-sm text-ink-2">
          Get a short, kind summary of your last seven days: a bright spot, a pattern worth noticing, and one tiny focus for next week.
        </p>
      )}
    </section>
  );
}
