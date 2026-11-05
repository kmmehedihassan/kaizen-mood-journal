import { test } from "node:test";
import assert from "node:assert/strict";
import { builtinReview, sanitizeSummary, summarizeWeek } from "@/lib/weekly";
import { addDays, dayKey } from "@/lib/dates";
import type { JournalEntry } from "@/lib/journal";

const end = new Date(2026, 10, 8, 12); // a Sunday
const e = (daysAgo: number, mood: JournalEntry["mood"], tags: string[] = [], extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `${daysAgo}-${mood}`, day: dayKey(addDays(end, -daysAgo)), createdAt: addDays(end, -daysAgo).getTime(),
  mood, intensity: 3, note: "", tags, ...extra,
});

test("summarizes only the last 7 days", () => {
  const s = summarizeWeek([e(0, "joyful", ["friends"]), e(1, "joyful", ["friends"]), e(2, "sad", ["work"]), e(3, "anxious", ["work"]), e(9, "angry")], end);
  assert.equal(s.checkIns, 4);
  assert.equal(s.daysJournaled, 4);
  assert.equal(s.start, "2026-11-02");
  assert.equal(s.topMoods[0].mood, "joyful");
  assert.equal(s.bestDay?.mood, "joyful");
  assert.ok(["sad", "anxious"].includes(s.hardestDay!.mood));
  assert.deepEqual(s.lifts, ["friends"]);
  assert.deepEqual(s.drains, ["work"]);
});

test("built-in review mentions a focus and handles an empty week", () => {
  const s = summarizeWeek([e(0, "calm"), e(2, "tired", [], { gratitude: "tea" })], end);
  assert.match(builtinReview(s), /Your 1% focus:/);
  assert.match(builtinReview(summarizeWeek([], end)), /No check-ins/);
});

test("sanitizeSummary clamps and drops junk from untrusted input", () => {
  const s = sanitizeSummary({
    start: "2026-11-02", end: "x", checkIns: 1e9, daysJournaled: -4, avgValence: 99,
    topMoods: [{ mood: "joyful", count: 2 }, { mood: "hacker", count: 1 }],
    bestDay: { day: "2026-11-03", mood: "nope" }, lifts: ["a".repeat(99), 5], notes: Array(20).fill("n"),
  })!;
  assert.equal(s.end, "");
  assert.equal(s.checkIns, 500);
  assert.equal(s.daysJournaled, 0);
  assert.equal(s.avgValence, 2);
  assert.equal(s.topMoods.length, 1);
  assert.equal(s.bestDay, null);
  assert.equal(s.lifts[0].length, 30);
  assert.equal(s.notes.length, 7);
  assert.equal(sanitizeSummary(null), null);
});
