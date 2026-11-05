// src/components/settings/SyncSettingsCard.tsx
"use client";

import { useEffect, useState } from "react";
import { disableSync, enableSync, syncNow, syncStore } from "@/lib/sync";
import { formatSyncCode, generateSyncCode } from "@/lib/syncCore";
import { useHydrated } from "@/lib/store";
import { toast } from "@/components/Toaster";

function ago(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
}

export function SyncSettingsCard() {
  const hydrated = useHydrated();
  const sync = syncStore.use();
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [, tick] = useState(0);

  // Re-render periodically so "synced 2 min ago" stays fresh.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Sync code copied", "📋");
    } catch {
      toast("Couldn't copy — select the code and copy it manually", "⚠️");
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await enableSync(generateSyncCode(), "create");
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Couldn't turn on sync.");
    setJustCreated(true);
    setReveal(true);
    toast("Sync is on. Save your code!", "🔐");
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    const res = await enableSync(joinCode, "join");
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Couldn't connect.");
    setJoinCode("");
    toast("Connected — your journals are merged", "🔄");
  };

  if (!hydrated) return <section className="card h-48 animate-pulse" aria-hidden />;

  return (
    <section className="card space-y-4 p-5" aria-labelledby="sync-h">
      <div>
        <h2 id="sync-h" className="font-semibold">🔄 Sync between devices</h2>
        <p className="mt-1 text-sm text-ink-2">
          End-to-end encrypted: your journal is locked with your sync code <em>before</em> it leaves this device. The server stores
          only unreadable data — no account, email or password.
        </p>
      </div>

      {!sync.code ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl bg-surface-2 p-4">
            <p className="text-sm font-medium">First device</p>
            <p className="text-xs text-ink-2">Create a private sync code for your journal.</p>
            <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={create}>
              {busy ? "Setting up…" : "Turn on sync"}
            </button>
          </div>
          <form
            className="space-y-2 rounded-xl bg-surface-2 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              join();
            }}
          >
            <label htmlFor="join-code" className="text-sm font-medium">Already have a code?</label>
            <input
              id="join-code"
              className="input font-mono text-sm uppercase tracking-wider"
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button type="submit" className="btn btn-ghost w-full" disabled={busy || !joinCode.trim()}>
              {busy ? "Connecting…" : "Connect this device"}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {justCreated && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <strong>Save this code somewhere safe</strong> (a password manager is ideal). It&apos;s the only key to your synced
              journal: anyone with it can read your entries, and it can&apos;t be recovered if lost.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-sm tracking-wider" aria-label="Your sync code">
              {reveal ? formatSyncCode(sync.code) : "••••-••••-••••-••••-" + sync.code.slice(-4)}
            </code>
            <button type="button" className="chip" onClick={() => setReveal((r) => !r)}>{reveal ? "Hide" : "Show"}</button>
            <button type="button" className="chip" onClick={() => copy(formatSyncCode(sync.code!))}>Copy</button>
          </div>
          <p className="text-xs text-muted">On your other device, open Settings → “Already have a code?” and enter it.</p>

          <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
            <span
              className={`inline-flex items-center gap-1.5 ${sync.status === "error" ? "text-rose-600" : "text-ink-2"}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  sync.status === "syncing" ? "animate-pulse bg-amber-500" : sync.status === "error" ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
              {sync.status === "syncing"
                ? "Syncing…"
                : sync.status === "error"
                  ? sync.error ?? "Sync failed"
                  : sync.lastSyncedAt
                    ? `Synced ${ago(sync.lastSyncedAt)}`
                    : "Ready"}
            </span>
            <button type="button" className="chip" disabled={sync.status === "syncing"} onClick={() => syncNow()}>
              ↻ Sync now
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                await disableSync(false);
                setJustCreated(false);
                toast("Sync turned off on this device", "⏸️");
              }}
            >
              Turn off on this device
            </button>
            <button
              type="button"
              className="btn btn-ghost text-rose-600"
              onClick={async () => {
                if (!confirm("Erase the encrypted copy from the server? Other devices will stop syncing. Entries on this device stay.")) return;
                await disableSync(true);
                setJustCreated(false);
                toast("Server copy erased", "🧹");
              }}
            >
              Erase from server
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
    </section>
  );
}
