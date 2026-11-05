// src/components/journal/JournalClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MoodPicker } from "@/components/MoodPicker";
import { EntryCard } from "@/components/journal/EntryCard";
import { useDictation } from "@/components/journal/useDictation";
import { toast } from "@/components/Toaster";
import { MOODS, MOOD_MAP, isMoodId, type MoodId } from "@/lib/moods";
import { detectMood } from "@/lib/sentiment";
import { SUGGESTED_TAGS, addEntry, byDay, journalStore, seedDemoData, streaks } from "@/lib/journal";
import { formatDay, dayKey } from "@/lib/dates";
import { useHydrated } from "@/lib/store";

const INTENSITY = ["", "A little", "Somewhat", "Moderately", "Very", "Extremely"];
const PROMPTS = [
  "What's on your mind right now?",
  "What was the best part of today?",
  "What drained your energy today?",
  "What would make tomorrow 1% better?",
  "Who or what helped you today?",
  "What are you avoiding, and why?",
];

export function JournalClient() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const entries = journalStore.use();

  const [mood, setMood] = useState<MoodId | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [filter, setFilter] = useState<MoodId | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const m = params.get("mood");
    if (isMoodId(m)) setMood(m);
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, [params]);

  const dictation = useDictation((text) =>
    setNote((prev) => {
      if (!text) return prev;
      const sentence = text.charAt(0).toUpperCase() + text.slice(1);
      return prev ? `${prev.trimEnd()}${/[.!?]$/.test(prev.trimEnd()) ? "" : "."} ${sentence}` : sentence;
    })
  );

  // Live mood suggestion from what the user writes.
  const detected = useMemo(() => detectMood(note), [note]);
  const suggested = detected.confidence >= 0.4 ? detected.mood : null;

  const { current, journaledToday } = streaks(entries);

  const allTags = useMemo(() => {
    const used = entries.flatMap((e) => e.tags);
    return Array.from(new Set([...SUGGESTED_TAGS, ...used, ...tags]));
  }, [entries, tags]);

  const save = () => {
    if (!mood) {
      toast("Pick a mood first", "👆");
      return;
    }
    addEntry({ mood, intensity, note, tags, gratitude });
    toast(
      !journaledToday ? `Checked in! ${current + 1}-day streak 🔥` : "Saved. Another flower for your garden.",
      MOOD_MAP[mood].emoji
    );
    setNote("");
    setTags([]);
    setGratitude("");
    setIntensity(3);
    setMood(null);
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  };

  const filtered = entries.filter(
    (e) =>
      (filter === "all" || e.mood === filter) &&
      (!search ||
        e.note.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some((t) => t.includes(search.toLowerCase())) ||
        e.gratitude?.toLowerCase().includes(search.toLowerCase()))
  );
  const grouped = [...byDay(filtered).entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const today = hydrated ? dayKey() : "";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ------------------------------ Composer ------------------------------ */}
      <section aria-labelledby="new-entry" className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div>
          <h1 id="new-entry" className="text-3xl font-semibold tracking-tight">Journal</h1>
          <p className="mt-1 text-ink-2">A private space. Everything stays in this browser.</p>
        </div>

        <div className="card space-y-5 p-5">
          <MoodPicker value={mood} onChange={setMood} suggested={suggested} compact />

          <div>
            <label htmlFor="intensity" className="flex justify-between text-sm font-medium">
              <span>Intensity</span>
              <span className="text-muted">{INTENSITY[intensity]}</span>
            </label>
            <input
              id="intensity"
              type="range"
              min={1}
              max={5}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="note" className="text-sm font-medium">{prompt}</label>
              <span className="flex items-center gap-1">
                {dictation.supported && (
                  <button
                    type="button"
                    onClick={dictation.listening ? dictation.stop : dictation.start}
                    aria-pressed={dictation.listening}
                    aria-label={dictation.listening ? "Stop voice input" : "Speak your entry"}
                    title={dictation.listening ? "Stop" : "Speak instead of typing"}
                    className={`grid h-8 w-8 place-items-center rounded-full text-sm transition ${
                      dictation.listening ? "animate-pulse bg-rose-500 text-white" : "text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {dictation.listening ? "■" : "🎙️"}
                  </button>
                )}
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full text-xs text-muted hover:bg-surface-2 hover:text-ink"
                  onClick={() => setPrompt(PROMPTS[(PROMPTS.indexOf(prompt) + 1) % PROMPTS.length])}
                  title="Another prompt"
                  aria-label="Another prompt"
                >
                  ↻
                </button>
              </span>
            </div>
            <textarea
              id="note"
              rows={4}
              className="input mt-2 resize-y"
              placeholder="Write freely — a word or a page."
              value={note}
              maxLength={4000}
              onChange={(e) => setNote(e.target.value)}
            />
            {dictation.listening && (
              <p className="mt-2 text-xs text-ink-2" aria-live="polite">
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                Listening… <span className="italic text-muted">{dictation.interim}</span>
              </p>
            )}
            {dictation.error && <p className="mt-2 text-xs text-rose-600" role="alert">{dictation.error}</p>}
            {suggested && suggested !== mood && (
              <button type="button" onClick={() => setMood(suggested)} className="mt-2 text-xs text-accent-ink hover:underline">
                Sounds like you might be feeling {MOOD_MAP[suggested].label.toLowerCase()} {MOOD_MAP[suggested].emoji} — use that?
              </button>
            )}
          </div>

          <div>
            <p className="text-sm font-medium">Tags</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="chip"
                  aria-pressed={tags.includes(t)}
                  onClick={() => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                >
                  #{t}
                </button>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = tagDraft.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
                  if (t && !tags.includes(t)) setTags((p) => [...p, t]);
                  setTagDraft("");
                }}
              >
                <input
                  className="chip w-24 bg-transparent outline-none focus:border-accent"
                  placeholder="+ tag"
                  value={tagDraft}
                  maxLength={24}
                  onChange={(e) => setTagDraft(e.target.value)}
                  aria-label="Add a custom tag"
                />
              </form>
            </div>
          </div>

          <div>
            <label htmlFor="gratitude" className="text-sm font-medium">One thing I&apos;m grateful for <span className="text-muted">(optional)</span></label>
            <input
              id="gratitude"
              className="input mt-2"
              placeholder="e.g. the sunlight on my desk"
              value={gratitude}
              maxLength={200}
              onChange={(e) => setGratitude(e.target.value)}
            />
          </div>

          <button type="button" className="btn btn-primary w-full" onClick={save} disabled={!mood}>
            {mood ? `Save ${MOOD_MAP[mood].emoji} check-in` : "Choose a mood to save"}
          </button>
        </div>
      </section>

      {/* ------------------------------ Timeline ------------------------------ */}
      <section aria-labelledby="timeline" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="timeline" className="text-xl font-semibold tracking-tight">
            Timeline {hydrated && <span className="text-sm font-normal text-muted">· {entries.length} entries</span>}
          </h2>
        </div>

        {hydrated && entries.length > 0 && (
          <div className="space-y-3">
            <input
              type="search"
              className="input"
              placeholder="Search notes, tags, gratitude…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search entries"
            />
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button type="button" className="chip shrink-0" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
              {MOODS.map((m) => (
                <button key={m.id} type="button" className="chip shrink-0" aria-pressed={filter === m.id} onClick={() => setFilter(m.id)}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!hydrated ? (
          <div className="card h-40 animate-pulse" />
        ) : entries.length === 0 ? (
          <div className="card space-y-4 p-8 text-center">
            <p className="text-5xl" aria-hidden>🌱</p>
            <p className="font-medium">Your journal is empty — and that&apos;s a perfect place to start.</p>
            <p className="text-sm text-ink-2">Write your first check-in, or plant a demo garden to explore the app.</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => toast(`Planted ${seedDemoData()} demo check-ins`, "🌷")}
            >
              Try with sample data
            </button>
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted">No entries match.</p>
        ) : (
          <ol className="space-y-6">
            {grouped.map(([day, list]) => (
              <li key={day} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {day === today ? "Today" : formatDay(day, { weekday: "long", month: "short", day: "numeric" })}
                </h3>
                <ul className="space-y-3">
                  {list.map((e) => (
                    <li key={e.id}>
                      <EntryCard entry={e} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
