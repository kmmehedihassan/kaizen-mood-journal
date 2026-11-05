import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decryptPayload,
  deriveVault,
  encryptPayload,
  formatSyncCode,
  generateSyncCode,
  isValidSyncCode,
  mergePayloads,
  normalizeSyncCode,
  type SyncPayload,
} from "@/lib/syncCore";
import type { JournalEntry } from "@/lib/journal";

const entry = (id: string, createdAt: number, extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id, day: "2026-11-01", createdAt, mood: "calm", intensity: 3, note: id, tags: [], ...extra,
});
const payload = (p: Partial<SyncPayload> = {}): SyncPayload => ({
  v: 1, entries: [], favorites: [], actions: {}, tombstones: {}, breathSessions: 0, seenMilestones: [], ...p,
});

test("sync codes are 20 unambiguous characters with ~100 bits of entropy", () => {
  const codes = new Set(Array.from({ length: 200 }, generateSyncCode));
  assert.equal(codes.size, 200, "no collisions");
  for (const c of codes) {
    assert.match(c, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/);
    assert.ok(isValidSyncCode(c));
  }
});

test("codes tolerate typing mistakes like lowercase, spaces, O/0 and I/1", () => {
  const c = "ABCD-EFGH-JK01-MNPQ-RSTV";
  assert.equal(normalizeSyncCode(" abcd efgh jkoi mnpq rstv "), normalizeSyncCode(c));
  assert.equal(formatSyncCode("abcdefghjk01mnpqrstv"), c);
  assert.equal(isValidSyncCode("too-short"), false);
});

test("the same code always derives the same vault; different codes don't", async () => {
  const a1 = await deriveVault("ABCD-EFGH-JK01-MNPQ-RSTV");
  const a2 = await deriveVault("abcdefghjk01mnpqrstv");
  const b = await deriveVault(generateSyncCode());
  assert.equal(a1.id, a2.id);
  assert.match(a1.id, /^[0-9a-f]{64}$/);
  assert.notEqual(a1.id, b.id);
});

test("encryption round-trips, hides content, and rejects the wrong key", async () => {
  const code = generateSyncCode();
  const { key } = await deriveVault(code);
  const secret = payload({ entries: [entry("e1", 1, { note: "my private thoughts" })] });
  const ct = await encryptPayload(key, secret);
  assert.ok(!ct.includes("private"), "ciphertext must not leak plaintext");
  assert.notEqual(ct, await encryptPayload(key, secret), "fresh IV every time");
  assert.deepEqual(await decryptPayload(key, ct), secret);
  const wrong = await deriveVault(generateSyncCode());
  await assert.rejects(() => decryptPayload(wrong.key, ct));
});

test("merge: union of entries, newest edit wins", () => {
  const a = payload({ entries: [entry("x", 1, { note: "old" }), entry("only-a", 2)] });
  const b = payload({ entries: [entry("x", 1, { note: "edited", updatedAt: 50 }), entry("only-b", 3)] });
  const m = mergePayloads(a, b);
  assert.deepEqual(m.entries.map((e) => e.id).sort(), ["only-a", "only-b", "x"]);
  assert.equal(m.entries.find((e) => e.id === "x")!.note, "edited");
});

test("merge: a deletion beats older copies but not a later edit", () => {
  const a = payload({ entries: [entry("gone", 1), entry("revived", 1, { updatedAt: 100 })], tombstones: {} });
  const b = payload({ tombstones: { gone: 10, revived: 50 } });
  const ids = mergePayloads(a, b).entries.map((e) => e.id);
  assert.deepEqual(ids, ["revived"]);
});

test("merge: favourites union and respect removals", () => {
  const q = { id: "q1", text: "Little by little.", author: "T", category: "wisdom" };
  const a = payload({ favorites: [{ ...q, savedAt: 5 }] });
  const b = payload({ tombstones: { "fav:littlebylittle": 9 } });
  assert.equal(mergePayloads(a, b).favorites.length, 0);
  const resaved = payload({ favorites: [{ ...q, savedAt: 20 }] });
  assert.equal(mergePayloads(mergePayloads(a, b), resaved).favorites.length, 1);
});

test("merge is order-independent and idempotent", () => {
  const a = payload({ entries: [entry("1", 1), entry("2", 2, { updatedAt: 9 })], actions: { d: ["x"] }, breathSessions: 2, seenMilestones: ["m1"] });
  const b = payload({ entries: [entry("2", 2), entry("3", 3)], actions: { d: ["y"] }, breathSessions: 5, tombstones: { "1": 4 }, seenMilestones: ["m2"] });
  const ab = mergePayloads(a, b);
  assert.deepEqual(ab, mergePayloads(b, a));
  assert.deepEqual(ab, mergePayloads(ab, ab));
  assert.deepEqual(ab.actions.d, ["x", "y"]);
  assert.equal(ab.breathSessions, 5);
  assert.deepEqual(ab.seenMilestones, ["m1", "m2"]);
});
