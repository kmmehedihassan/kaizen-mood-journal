// src/lib/syncCore.ts
// End-to-end encrypted sync, the pure parts (no React, no storage), so it can
// be unit-tested and reused.
//
// Model: a random sync code (~100 bits) is the only secret. From it we derive
//   • vaultId  = SHA-256("kaizen-vault:" + code)  → where the server stores data
//   • key      = PBKDF2(code)                       → AES-GCM key, never leaves the device
// The server only ever sees vaultId and ciphertext, so it cannot read journals.

import type { JournalEntry, SavedQuote } from "@/lib/journal";

export interface SyncPayload {
  v: 1;
  entries: JournalEntry[];
  favorites: SavedQuote[];
  actions: Record<string, string[]>;
  tombstones: Record<string, number>;
  breathSessions: number;
  seenMilestones: string[];
}

/* ------------------------------ Sync codes ------------------------------ */

// Crockford-style alphabet: no I, L, O, U to avoid misreading codes aloud.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 20; // 20 × 5 bits = 100 bits of entropy

export function generateSyncCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, (b) => ALPHABET[b & 31]).join("");
  return formatSyncCode(raw);
}

export function normalizeSyncCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .replace(/[^0-9A-Z]/g, "");
}

export function isValidSyncCode(input: string): boolean {
  const c = normalizeSyncCode(input);
  return c.length === CODE_LENGTH && [...c].every((ch) => ALPHABET.includes(ch));
}

export function formatSyncCode(input: string): string {
  return normalizeSyncCode(input).match(/.{1,4}/g)?.join("-") ?? "";
}

/* ------------------------------- Crypto -------------------------------- */

const enc = new TextEncoder();
const dec = new TextDecoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64: string) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export interface Vault {
  id: string;
  key: CryptoKey;
}

export async function deriveVault(code: string): Promise<Vault> {
  const c = normalizeSyncCode(code);
  const id = toHex(await crypto.subtle.digest("SHA-256", enc.encode(`kaizen-vault:${c}`)));
  const material = await crypto.subtle.importKey("raw", enc.encode(c), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("kaizen-sync-v1"), iterations: 150_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return { id, key };
}

export async function encryptPayload(key: CryptoKey, payload: SyncPayload): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload))));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toBase64(out);
}

export async function decryptPayload(key: CryptoKey, ciphertext: string): Promise<SyncPayload> {
  const bytes = fromBase64(ciphertext);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.subarray(0, 12) }, key, bytes.subarray(12));
  const parsed = JSON.parse(dec.decode(plain));
  if (parsed?.v !== 1) throw new Error("Unsupported sync data version");
  return parsed as SyncPayload;
}

/* -------------------------------- Merge -------------------------------- */

const stamp = (e: JournalEntry) => e.updatedAt ?? e.createdAt;
const favKey = (text: string) => `fav:${text.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

/**
 * Merge two device states. Deterministic and order-independent:
 *  - entries: newest edit wins; a deletion wins over any version older than it
 *  - favourites: union, minus ones removed after they were saved
 *  - tiny actions & milestones: union; breathing sessions: max
 */
export function mergePayloads(a: SyncPayload, b: SyncPayload): SyncPayload {
  const tombstones: Record<string, number> = { ...a.tombstones };
  for (const [k, t] of Object.entries(b.tombstones ?? {})) tombstones[k] = Math.max(tombstones[k] ?? 0, t);

  const byId = new Map<string, JournalEntry>();
  for (const e of [...(a.entries ?? []), ...(b.entries ?? [])]) {
    const cur = byId.get(e.id);
    if (!cur || stamp(e) > stamp(cur)) byId.set(e.id, e);
  }
  const entries = [...byId.values()]
    .filter((e) => !(tombstones[e.id] && tombstones[e.id] >= stamp(e)))
    .sort((x, y) => y.createdAt - x.createdAt || x.id.localeCompare(y.id));

  const favs = new Map<string, SavedQuote>();
  for (const f of [...(a.favorites ?? []), ...(b.favorites ?? [])]) {
    const k = favKey(f.text);
    const cur = favs.get(k);
    if (!cur || (f.savedAt ?? 0) > (cur.savedAt ?? 0)) favs.set(k, f);
  }
  const favorites = [...favs.entries()]
    .filter(([k, f]) => !(tombstones[k] && tombstones[k] > (f.savedAt ?? 0)))
    .map(([, f]) => f)
    .sort((x, y) => (y.savedAt ?? 0) - (x.savedAt ?? 0) || x.text.localeCompare(y.text));

  const actions: Record<string, string[]> = {};
  for (const src of [a.actions ?? {}, b.actions ?? {}]) {
    for (const [day, list] of Object.entries(src)) actions[day] = [...new Set([...(actions[day] ?? []), ...list])].sort();
  }

  return {
    v: 1,
    entries,
    favorites,
    actions,
    tombstones,
    breathSessions: Math.max(a.breathSessions ?? 0, b.breathSessions ?? 0),
    seenMilestones: [...new Set([...(a.seenMilestones ?? []), ...(b.seenMilestones ?? [])])].sort(),
  };
}

/** Stable fingerprint so we can skip uploads when nothing changed. */
export function payloadFingerprint(p: SyncPayload): string {
  return JSON.stringify(mergePayloads(p, { ...p }));
}
