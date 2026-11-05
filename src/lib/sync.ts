// src/lib/sync.ts
"use client";

import { createLocalStore } from "@/lib/store";
import {
  breathSessionsStore,
  completedActionsStore,
  favoritesStore,
  journalStore,
  seenMilestonesStore,
  tombstonesStore,
} from "@/lib/journal";
import {
  decryptPayload,
  deriveVault,
  encryptPayload,
  formatSyncCode,
  isValidSyncCode,
  mergePayloads,
  payloadFingerprint,
  type SyncPayload,
  type Vault,
} from "@/lib/syncCore";

export type SyncStatus = "off" | "idle" | "syncing" | "error";

export interface SyncState {
  code: string | null;
  revision: number;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error?: string;
}

export const syncStore = createLocalStore<SyncState>("kaizen.sync.v1", {
  code: null,
  revision: 0,
  lastSyncedAt: null,
  status: "off",
});

/** Stores whose contents are synced. Subscribed to for auto-sync. */
export const SYNCED_STORES = [journalStore, favoritesStore, completedActionsStore, tombstonesStore, breathSessionsStore, seenMilestonesStore];

export function localPayload(): SyncPayload {
  return {
    v: 1,
    entries: journalStore.get(),
    favorites: favoritesStore.get(),
    actions: completedActionsStore.get(),
    tombstones: tombstonesStore.get(),
    breathSessions: breathSessionsStore.get(),
    seenMilestones: seenMilestonesStore.get(),
  };
}

function applyPayload(p: SyncPayload) {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(journalStore.get(), p.entries)) journalStore.set(p.entries);
  if (!same(favoritesStore.get(), p.favorites)) favoritesStore.set(p.favorites);
  if (!same(completedActionsStore.get(), p.actions)) completedActionsStore.set(p.actions);
  if (!same(tombstonesStore.get(), p.tombstones)) tombstonesStore.set(p.tombstones);
  if (breathSessionsStore.get() !== p.breathSessions) breathSessionsStore.set(p.breathSessions);
  if (!same(seenMilestonesStore.get(), p.seenMilestones)) seenMilestonesStore.set(p.seenMilestones);
}

const vaultCache = new Map<string, Promise<Vault>>();
const getVault = (code: string) => {
  if (!vaultCache.has(code)) vaultCache.set(code, deriveVault(code));
  return vaultCache.get(code)!;
};

let inflight: Promise<void> | null = null;
let queued = false;
let lastPushed = "";

class SyncError extends Error {}

async function pull(vault: Vault): Promise<{ payload: SyncPayload | null; revision: number }> {
  const res = await fetch(`/api/sync?vault=${vault.id}`, { cache: "no-store" });
  if (res.status === 404) return { payload: null, revision: 0 };
  if (res.status === 503) throw new SyncError("Sync isn't available on this server yet.");
  if (!res.ok) throw new SyncError(`Couldn't download your journal (${res.status}).`);
  const data = (await res.json()) as { ciphertext: string; revision: number };
  try {
    return { payload: await decryptPayload(vault.key, data.ciphertext), revision: data.revision };
  } catch {
    throw new SyncError("Couldn't decrypt the synced journal. Is the sync code correct?");
  }
}

async function runSync(): Promise<void> {
  const state = syncStore.get();
  if (!state.code) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    syncStore.set((s) => ({ ...s, status: "error", error: "You're offline — changes will sync when you reconnect." }));
    return;
  }
  syncStore.set((s) => ({ ...s, status: "syncing", error: undefined }));
  const vault = await getVault(state.code);

  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await pull(vault);
    const merged = remote.payload ? mergePayloads(localPayload(), remote.payload) : mergePayloads(localPayload(), localPayload());
    applyPayload(merged);

    const fingerprint = payloadFingerprint(merged);
    const remoteFingerprint = remote.payload ? payloadFingerprint(remote.payload) : "";
    if (fingerprint === remoteFingerprint) {
      lastPushed = fingerprint;
      syncStore.set((s) => ({ ...s, revision: remote.revision, lastSyncedAt: Date.now(), status: "idle", error: undefined }));
      return;
    }

    const res = await fetch("/api/sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault: vault.id, ciphertext: await encryptPayload(vault.key, merged), baseRevision: remote.revision }),
    });
    if (res.status === 409) continue; // another device saved first: pull, merge, retry
    if (res.status === 503) throw new SyncError("Sync isn't available on this server yet.");
    if (!res.ok) throw new SyncError(`Couldn't upload your journal (${res.status}).`);
    const { revision } = (await res.json()) as { revision: number };
    lastPushed = fingerprint;
    syncStore.set((s) => ({ ...s, revision, lastSyncedAt: Date.now(), status: "idle", error: undefined }));
    return;
  }
  throw new SyncError("Another device keeps saving at the same time — try again in a moment.");
}

/** Pull, merge and push. Concurrent calls are coalesced. */
export function syncNow(): Promise<void> {
  if (inflight) {
    queued = true;
    return inflight;
  }
  inflight = runSync()
    .catch((e) => {
      syncStore.set((s) => ({ ...s, status: "error", error: e instanceof SyncError ? e.message : "Sync failed — check your connection." }));
    })
    .finally(() => {
      inflight = null;
      if (queued) {
        queued = false;
        void syncNow();
      }
    });
  return inflight;
}

/** Has local data changed since the last successful sync? */
export function hasUnsyncedChanges() {
  return payloadFingerprint(localPayload()) !== lastPushed;
}

/** Start syncing with a code. `join` requires the vault to already exist. */
export async function enableSync(rawCode: string, mode: "create" | "join"): Promise<{ ok: boolean; error?: string }> {
  if (!isValidSyncCode(rawCode)) return { ok: false, error: "That doesn't look like a valid sync code (20 letters and numbers)." };
  const code = formatSyncCode(rawCode);
  if (mode === "join") {
    try {
      const { payload } = await pull(await getVault(code));
      if (!payload) return { ok: false, error: "No synced journal found for that code." };
    } catch (e) {
      return { ok: false, error: e instanceof SyncError ? e.message : "Couldn't reach the server." };
    }
  }
  syncStore.set({ code, revision: 0, lastSyncedAt: null, status: "syncing" });
  await syncNow();
  const s = syncStore.get();
  if (s.status === "error" && mode === "create") {
    syncStore.set({ code: null, revision: 0, lastSyncedAt: null, status: "off" });
    return { ok: false, error: s.error };
  }
  return { ok: true };
}

/** Stop syncing on this device; optionally erase the encrypted copy from the server. */
export async function disableSync(eraseFromServer: boolean) {
  const { code } = syncStore.get();
  if (code && eraseFromServer) {
    const vault = await getVault(code);
    await fetch(`/api/sync?vault=${vault.id}`, { method: "DELETE" }).catch(() => {});
  }
  lastPushed = "";
  syncStore.set({ code: null, revision: 0, lastSyncedAt: null, status: "off" });
}
