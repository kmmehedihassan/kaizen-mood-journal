import "./setup";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { resetStorage } from "./setup";
import { addEntry, dayValence, importJournal, journalStore, normalizeTags, streaks, type JournalEntry } from "@/lib/journal";
import { addDays, dayKey } from "@/lib/dates";

const entry = (daysAgo: number, mood: JournalEntry["mood"] = "calm", intensity = 3): JournalEntry => ({
  id: `e${daysAgo}-${mood}`,
  day: dayKey(addDays(new Date(), -daysAgo)),
  createdAt: addDays(new Date(), -daysAgo).getTime(),
  mood,
  intensity,
  note: "",
  tags: [],
});

beforeEach(() => resetStorage());

test("streak counts consecutive days ending today", () => {
  const s = streaks([entry(0), entry(1), entry(2), entry(4)]);
  assert.equal(s.current, 3);
  assert.equal(s.longest, 3);
  assert.equal(s.totalDays, 4);
  assert.equal(s.journaledToday, true);
});

test("streak survives until you journal today", () => {
  const s = streaks([entry(1), entry(2)]);
  assert.equal(s.current, 2);
  assert.equal(s.journaledToday, false);
});

test("streak resets after a missed day", () => {
  assert.equal(streaks([entry(2), entry(3)]).current, 0);
});

test("dayValence weights by intensity and stays in range", () => {
  assert.equal(dayValence([]), null);
  const v = dayValence([entry(0, "joyful", 5), entry(0, "sad", 1)])!;
  assert.ok(v > 0 && v <= 2, `expected positive valence, got ${v}`);
});

test("normalizeTags lowercases, dedupes and strips #", () => {
  assert.deepEqual(normalizeTags(["#Work", "work", " Deep Focus ", ""]), ["work", "deep-focus"]);
});

test("addEntry persists and clamps intensity", () => {
  addEntry({ mood: "joyful", intensity: 99, note: "  hi  ", tags: ["Fun"] });
  const [e] = journalStore.get();
  assert.equal(e.intensity, 5);
  assert.equal(e.note, "hi");
  assert.deepEqual(e.tags, ["fun"]);
});

test("importJournal keeps valid entries, skips junk and duplicates", () => {
  const file = JSON.stringify({
    entries: [entry(0), { mood: "not-a-mood", day: "2026-01-01" }, { mood: "sad", day: "bad-date" }, entry(1, "sad")],
  });
  assert.equal(importJournal(file), 2);
  assert.equal(importJournal(file), 0, "re-importing the same file adds nothing");
  assert.throws(() => importJournal("{}"));
});
