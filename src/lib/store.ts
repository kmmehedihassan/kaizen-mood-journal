// src/lib/store.ts
"use client";

// Minimal localStorage-backed stores, shared across components and tabs via
// useSyncExternalStore. Journal data never leaves the device unless the user
// exports it — privacy by default.

import { useSyncExternalStore } from "react";

const EVENT = "kaizen-store";

export interface LocalStore<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(cb: () => void): () => void;
  use(): T;
}

export function createLocalStore<T>(key: string, fallback: T): LocalStore<T> {
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;

  const read = (): T => {
    if (typeof window === "undefined") return fallback;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      return cachedValue;
    }
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    try {
      cachedValue = raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      cachedValue = fallback;
    }
    return cachedValue;
  };

  const store: LocalStore<T> = {
    get: read,
    set(next) {
      const value =
        typeof next === "function" ? (next as (p: T) => T)(read()) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // storage full / blocked: keep the in-memory value so the UI still works
        cachedRaw = undefined;
        cachedValue = value;
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    subscribe(cb) {
      const onCustom = (e: Event) => {
        if ((e as CustomEvent).detail === key) cb();
      };
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener(EVENT, onCustom);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(EVENT, onCustom);
        window.removeEventListener("storage", onStorage);
      };
    },
    use() {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSyncExternalStore(store.subscribe, read, () => fallback);
    },
  };
  return store;
}

/** True after hydration — use to avoid rendering localStorage-dependent UI on the server. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
