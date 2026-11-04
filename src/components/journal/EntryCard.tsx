// src/components/journal/EntryCard.tsx
"use client";

import { useState } from "react";
import { MOOD_MAP } from "@/lib/moods";
import { deleteEntry, updateEntry, type JournalEntry } from "@/lib/journal";
import { toast } from "@/components/Toaster";

export function EntryCard({ entry }: { entry: JournalEntry }) {
  const mood = MOOD_MAP[entry.mood];
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reflect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: entry.mood, intensity: entry.intensity, note: entry.note, tags: entry.tags }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { reflection: string };
      updateEntry(entry.id, { reflection: data.reflection });
    } catch {
      toast("Couldn't get a reflection right now", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      className="card relative overflow-hidden p-4 pl-5"
      style={{ boxShadow: `inset 4px 0 0 hsl(${mood.hue} 75% 60%)` }}
    >
      <header className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>{mood.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {mood.label}
            <span className="ml-2 inline-flex gap-0.5 align-middle" aria-label={`Intensity ${entry.intensity} of 5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: i <= entry.intensity ? `hsl(${mood.hue} 70% 55%)` : "var(--border)" }}
                />
              ))}
            </span>
          </p>
          <p className="text-xs text-muted">
            {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        {confirming ? (
          <span className="flex gap-1 text-xs">
            <button type="button" className="rounded-full px-2 py-1 font-medium text-rose-600 hover:bg-rose-500/10" onClick={() => deleteEntry(entry.id)}>
              Delete
            </button>
            <button type="button" className="rounded-full px-2 py-1 text-muted hover:bg-surface-2" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            onClick={() => setConfirming(true)}
            aria-label="Delete entry"
          >
            🗑
          </button>
        )}
      </header>

      {entry.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{entry.note}</p>}
      {entry.gratitude && (
        <p className="mt-2 text-sm text-ink-2">
          <span aria-hidden>🙏 </span>
          <span className="italic">{entry.gratitude}</span>
        </p>
      )}
      {entry.tags.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">#{t}</span>
          ))}
        </p>
      )}

      {entry.reflection ? (
        <div className="mt-3 rounded-xl bg-accent-soft/60 p-3 text-sm leading-relaxed text-ink">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-ink">Kaizen reflects</p>
          {entry.reflection}
        </div>
      ) : (
        <button
          type="button"
          onClick={reflect}
          disabled={loading}
          className="mt-3 text-xs font-medium text-accent-ink hover:underline disabled:opacity-60"
        >
          {loading ? "Reflecting…" : "✨ Reflect on this"}
        </button>
      )}
    </article>
  );
}
