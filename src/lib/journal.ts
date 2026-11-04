// src/lib/journal.ts
"use client";

import { createLocalStore } from "@/lib/store";
import { dayKey, parseDayKey, addDays } from "@/lib/dates";
import { MOOD_MAP, isMoodId, type MoodId } from "@/lib/moods";
import type { Quote } from "@/data/quotes";

export interface JournalEntry {
  id: string;
  day: string; // YYYY-MM-DD (local)
  createdAt: number;
  mood: MoodId;
  intensity: number; // 1..5
  note: string;
  tags: string[];
  gratitude?: string;
  reflection?: string;
}

export const journalStore = createLocalStore<JournalEntry[]>("kaizen.journal.v1", []);
export const favoritesStore = createLocalStore<Quote[]>("kaizen.favorites.v1", []);
export const currentMoodStore = createLocalStore<MoodId | null>("kaizen.currentMood", null);
export const completedActionsStore = createLocalStore<Record<string, string[]>>("kaizen.actions.v1", {});

export const SUGGESTED_TAGS = [
  "work", "family", "friends", "exercise", "sleep", "outdoors",
  "study", "health", "creative", "food", "social", "alone-time",
];

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function addEntry(input: Omit<JournalEntry, "id" | "createdAt" | "day"> & { day?: string }) {
  const entry: JournalEntry = {
    id: uid(),
    createdAt: Date.now(),
    day: input.day ?? dayKey(),
    mood: input.mood,
    intensity: clampIntensity(input.intensity),
    note: input.note.trim(),
    tags: normalizeTags(input.tags),
    gratitude: input.gratitude?.trim() || undefined,
    reflection: input.reflection,
  };
  journalStore.set((prev) => [entry, ...prev]);
  currentMoodStore.set(entry.mood);
  return entry;
}

export function updateEntry(id: string, patch: Partial<JournalEntry>) {
  journalStore.set((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

export function deleteEntry(id: string) {
  journalStore.set((prev) => prev.filter((e) => e.id !== id));
}

export function clampIntensity(n: number) {
  return Math.min(5, Math.max(1, Math.round(Number.isFinite(n) ? n : 3)));
}

export function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(tags.map((t) => t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-")).filter(Boolean))
  ).slice(0, 12);
}

export function toggleFavorite(q: Quote) {
  favoritesStore.set((prev) =>
    prev.some((f) => f.text === q.text) ? prev.filter((f) => f.text !== q.text) : [q, ...prev]
  );
}

export function toggleAction(day: string, action: string) {
  completedActionsStore.set((prev) => {
    const list = prev[day] ?? [];
    const next = list.includes(action) ? list.filter((a) => a !== action) : [...list, action];
    return { ...prev, [day]: next };
  });
}

/* ------------------------------------------------------------------ */
/* Derived statistics                                                  */
/* ------------------------------------------------------------------ */

/** Entries grouped by day, newest entry first within each day. */
export function byDay(entries: JournalEntry[]) {
  const map = new Map<string, JournalEntry[]>();
  for (const e of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    const list = map.get(e.day) ?? [];
    list.push(e);
    map.set(e.day, list);
  }
  return map;
}

/** A single "score" for a day: mean valence weighted by intensity, in -2..2. */
export function dayValence(list: JournalEntry[]) {
  if (!list.length) return null;
  let sum = 0;
  let w = 0;
  for (const e of list) {
    const weight = 0.5 + e.intensity / 5;
    sum += MOOD_MAP[e.mood].valence * weight;
    w += weight;
  }
  return sum / w;
}

export function streaks(entries: JournalEntry[]) {
  const days = new Set(entries.map((e) => e.day));
  const today = new Date();
  // current streak: may start today or yesterday (so it's not "lost" before you journal today)
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  // longest streak
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = parseDayKey(k);
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest, totalDays: days.size, journaledToday: days.has(dayKey(today)) };
}

export function exportJournal(entries: JournalEntry[]) {
  const blob = new Blob([JSON.stringify({ app: "kaizen", version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaizen-journal-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Merge entries from an exported file. Returns the number of new entries. */
export function importJournal(json: string): number {
  const parsed = JSON.parse(json);
  const incoming: unknown[] = Array.isArray(parsed) ? parsed : parsed?.entries;
  if (!Array.isArray(incoming)) throw new Error("No entries found in file");
  const valid: JournalEntry[] = [];
  for (const raw of incoming) {
    const e = raw as Partial<JournalEntry>;
    if (!e || !isMoodId(e.mood) || typeof e.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.day)) continue;
    valid.push({
      id: typeof e.id === "string" ? e.id : uid(),
      day: e.day,
      createdAt: typeof e.createdAt === "number" ? e.createdAt : parseDayKey(e.day).getTime(),
      mood: e.mood,
      intensity: clampIntensity(e.intensity ?? 3),
      note: typeof e.note === "string" ? e.note : "",
      tags: Array.isArray(e.tags) ? normalizeTags(e.tags.filter((t): t is string => typeof t === "string")) : [],
      gratitude: typeof e.gratitude === "string" ? e.gratitude : undefined,
      reflection: typeof e.reflection === "string" ? e.reflection : undefined,
    });
  }
  let added = 0;
  journalStore.set((prev) => {
    const ids = new Set(prev.map((p) => p.id));
    const fresh = valid.filter((v) => !ids.has(v.id));
    added = fresh.length;
    return [...fresh, ...prev].sort((a, b) => b.createdAt - a.createdAt);
  });
  return added;
}

/** Generate a few weeks of believable sample data so new visitors can explore. */
export function seedDemoData() {
  const notes: Record<MoodId, string[]> = {
    joyful: ["Lunch with old friends, laughed a lot.", "Finished a project I'm proud of!"],
    grateful: ["Grateful for a slow morning coffee.", "Mum called just to check in."],
    calm: ["Long walk by the water.", "Quiet evening reading."],
    energized: ["Great workout, crushed my to-do list.", "Ideas flowing all day."],
    loved: ["Movie night with my partner.", "Surprise message from a friend."],
    tired: ["Slept badly, dragged through the day.", "Too many meetings."],
    anxious: ["Deadline tomorrow, mind racing.", "Big presentation coming up."],
    sad: ["Missing home today.", "Felt a bit lonely this evening."],
    angry: ["Train delayed twice.", "Frustrating call with support."],
  };
  const tagPool: Record<MoodId, string[]> = {
    joyful: ["friends", "social"], grateful: ["family"], calm: ["outdoors", "alone-time"],
    energized: ["exercise", "work"], loved: ["family", "social"], tired: ["work", "sleep"],
    anxious: ["work", "study"], sad: ["alone-time"], angry: ["work"],
  };
  const ids = Object.keys(MOOD_MAP) as MoodId[];
  const out: JournalEntry[] = [];
  const now = new Date();
  for (let i = 45; i >= 1; i--) {
    if (Math.random() < 0.18) continue; // some gaps feel more real
    const d = addDays(now, -i);
    // weekends skew happier, mid-week skews more tired/anxious
    const dow = d.getDay();
    const pool = dow === 0 || dow === 6
      ? ["joyful", "calm", "loved", "grateful", "energized", "tired"]
      : ids;
    const mood = pool[Math.floor(Math.random() * pool.length)] as MoodId;
    out.push({
      id: uid(),
      day: dayKey(d),
      createdAt: d.setHours(19, Math.floor(Math.random() * 59)),
      mood,
      intensity: 2 + Math.floor(Math.random() * 4),
      note: notes[mood][Math.floor(Math.random() * notes[mood].length)],
      tags: tagPool[mood],
    });
  }
  journalStore.set((prev) => [...prev, ...out].sort((a, b) => b.createdAt - a.createdAt));
  return out.length;
}
