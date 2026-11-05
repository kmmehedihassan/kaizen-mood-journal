// src/components/ReminderManager.tsx
"use client";

// Registers the service worker (offline + notifications) and schedules the
// daily check-in reminder while the app is open or installed.
import { useEffect } from "react";
import { createLocalStore } from "@/lib/store";
import { journalStore } from "@/lib/journal";
import { DEFAULT_REMINDER, minutesUntil, type ReminderSettings } from "@/lib/reminders";
import { dayKey } from "@/lib/dates";

export const reminderStore = createLocalStore<ReminderSettings>("kaizen.reminder.v1", DEFAULT_REMINDER);

const swEnabled = () =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production";

export async function swRegistration() {
  if (!swEnabled()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Ask the browser for permission. Returns the resulting permission. */
export async function requestNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export async function showTestNotification() {
  const reg = await swRegistration();
  if (reg?.active) {
    reg.active.postMessage({ type: "kaizen:remind", force: true });
  } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("How are you feeling today? 🌱", { body: "This is how your daily reminder will look.", icon: "/icon.svg" });
  }
}

export function ReminderManager() {
  const reminder = reminderStore.use();
  const entries = journalStore.use();
  const lastCheckIn = entries.reduce((max, e) => (e.day > max ? e.day : max), "");

  // Register the service worker once.
  useEffect(() => {
    if (!swEnabled()) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW registration failed", e));
  }, []);

  // Keep the worker informed so it can decide on reminders without the page.
  useEffect(() => {
    if (!swEnabled()) return;
    navigator.serviceWorker.ready
      .then(async (reg) => {
        reg.active?.postMessage({ type: "kaizen:meta", meta: { ...reminder, lastCheckIn } });
        // Periodic background sync (installed Chromium apps): lets reminders fire with the app closed.
        const periodic = (reg as ServiceWorkerRegistration & { periodicSync?: { register: (t: string, o: object) => Promise<void>; unregister: (t: string) => Promise<void> } }).periodicSync;
        if (!periodic) return;
        if (reminder.enabled) await periodic.register("kaizen-reminder", { minInterval: 6 * 60 * 60 * 1000 }).catch(() => {});
        else await periodic.unregister("kaizen-reminder").catch(() => {});
      })
      .catch(() => {});
  }, [reminder, lastCheckIn]);

  // In-page timer: fires while the app is open (including in a background tab).
  useEffect(() => {
    if (!reminder.enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const timer = setTimeout(async () => {
      if (journalStore.get().some((e) => e.day === dayKey())) return;
      const reg = await swRegistration();
      if (reg?.active) reg.active.postMessage({ type: "kaizen:remind" });
      else new Notification("How are you feeling today? 🌱", { body: "Take ten seconds to check in.", icon: "/icon.svg" });
    }, minutesUntil(reminder.time) * 60_000);
    return () => clearTimeout(timer);
  }, [reminder]);

  return null;
}
