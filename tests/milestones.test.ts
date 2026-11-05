import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMilestones } from "@/lib/milestones";
import { MOODS } from "@/lib/moods";
import { addDays, dayKey } from "@/lib/dates";
import type { JournalEntry } from "@/lib/journal";

const mk = (i: number, mood: JournalEntry["mood"] = "calm", extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id: String(i), day: dayKey(addDays(new Date(), -i)), createdAt: addDays(new Date(), -i).getTime(), mood, intensity: 3, note: "", tags: [], ...extra,
});
const get = (ms: ReturnType<typeof computeMilestones>, id: string) => ms.find((m) => m.id === id)!;

test("nothing is unlocked for a new user", () => {
  const ms = computeMilestones({ entries: [], actions: {}, breathSessions: 0, favorites: 0 });
  assert.ok(ms.every((m) => !m.unlocked && m.current === 0));
});

test("streaks, garden size and variety unlock the right milestones", () => {
  const entries = MOODS.map((m, i) => mk(i, m.id, { gratitude: i < 5 ? "x" : undefined, note: "a long enough note here" }));
  const ms = computeMilestones({ entries, actions: { d: Array(10).fill("a") }, breathSessions: 5, favorites: 3 });
  for (const id of ["first-seed", "streak-3", "streak-7", "full-spectrum", "grateful-5", "steps-10", "breath-5"]) {
    assert.ok(get(ms, id).unlocked, id);
  }
  assert.equal(get(ms, "garden-10").current, 9);
  assert.equal(get(ms, "garden-10").unlocked, false);
  assert.equal(get(ms, "curator").current, 3);
  assert.equal(get(ms, "streak-30").current, 9);
});

test("progress never exceeds the target", () => {
  const entries = Array.from({ length: 120 }, (_, i) => mk(i));
  for (const m of computeMilestones({ entries, actions: {}, breathSessions: 99, favorites: 99 })) {
    assert.ok(m.current <= m.target, m.id);
  }
});
