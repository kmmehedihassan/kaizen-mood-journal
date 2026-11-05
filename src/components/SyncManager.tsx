// src/components/SyncManager.tsx
"use client";

// Keeps an opted-in device in sync: on load, when the tab regains focus or
// reconnects, and a few seconds after any local change.
import { useEffect } from "react";
import { SYNCED_STORES, hasUnsyncedChanges, syncNow, syncStore } from "@/lib/sync";

export function SyncManager() {
  const { code } = syncStore.use();

  useEffect(() => {
    if (!code) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastFocusSync = 0;

    void syncNow();

    const onLocalChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (hasUnsyncedChanges()) void syncNow();
      }, 2500);
    };
    const unsubs = SYNCED_STORES.map((s) => s.subscribe(onLocalChange));

    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFocusSync > 30_000) {
        lastFocusSync = Date.now();
        void syncNow();
      }
    };
    const onOnline = () => void syncNow();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u());
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [code]);

  return null;
}
