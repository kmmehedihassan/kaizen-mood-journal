// src/components/journal/EntryCard.tsx
"use client";

import { useState } from "react";
import { MOODS, MOOD_MAP, type MoodId } from "@/lib/moods";
import { deleteEntry, normalizeTags, updateEntry, type JournalEntry } from "@/lib/journal";
import { toast } from "@/components/Toaster";

export function EntryCard({ entry }: { entry: JournalEntry }) {
  const mood = MOOD_MAP[entry.mood];
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ mood: entry.mood, intensity: entry.intensity, note: entry.note, gratitude: entry.gratitude ?? "", tags: entry.tags.join(", ") });

  const startEdit = () => {
    setDraft({ mood: entry.mood, intensity: entry.intensity, note: entry.note, gratitude: entry.gratitude ?? "", tags: entry.tags.join(", ") });
    setEditing(true);
  };
  const saveEdit = () => {
    const changedContent = draft.note.trim() !== entry.note || draft.mood !== entry.mood;
    updateEntry(entry.id, {
      mood: draft.mood,
      intensity: draft.intensity,
      note: draft.note.trim(),
      gratitude: draft.gratitude.trim() || undefined,
      tags: normalizeTags(draft.tags.split(",")),
      // A reflection about different words would be misleading.
      ...(changedContent ? { reflection: undefined } : {}),
    });
    setEditing(false);
    toast("Entry updated", "✏️");
  };

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
          <span className="flex">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
              onClick={() => (editing ? setEditing(false) : startEdit())}
              aria-label={editing ? "Cancel editing" : "Edit entry"}
              aria-expanded={editing}
            >
              {editing ? "✕" : "✏️"}
            </button>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
              onClick={() => setConfirming(true)}
              aria-label="Delete entry"
            >
              🗑
            </button>
          </span>
        )}
      </header>

      {editing && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Mood">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={draft.mood === m.id}
                aria-label={m.label}
                title={m.label}
                className="chip px-2"
                onClick={() => setDraft((d) => ({ ...d, mood: m.id as MoodId }))}
              >
                {m.emoji}
              </button>
            ))}
          </div>
          <label className="block text-xs font-medium text-ink-2">
            Intensity {draft.intensity}/5
            <input type="range" min={1} max={5} value={draft.intensity} className="mt-1 w-full"
              onChange={(e) => setDraft((d) => ({ ...d, intensity: Number(e.target.value) }))} />
          </label>
          <textarea className="input text-sm" rows={3} value={draft.note} maxLength={4000} aria-label="Note"
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
          <input className="input text-sm" value={draft.gratitude} maxLength={200} placeholder="Grateful for…" aria-label="Gratitude"
            onChange={(e) => setDraft((d) => ({ ...d, gratitude: e.target.value }))} />
          <input className="input text-sm" value={draft.tags} placeholder="tags, separated, by commas" aria-label="Tags"
            onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} />
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={saveEdit}>Save changes</button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!editing && entry.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{entry.note}</p>}
      {!editing && entry.gratitude && (
        <p className="mt-2 text-sm text-ink-2">
          <span aria-hidden>🙏 </span>
          <span className="italic">{entry.gratitude}</span>
        </p>
      )}
      {!editing && entry.tags.length > 0 && (
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
