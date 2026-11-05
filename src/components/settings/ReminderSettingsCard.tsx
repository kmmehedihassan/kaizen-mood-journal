// src/components/settings/ReminderSettingsCard.tsx
"use client";

import { useEffect, useState } from "react";
import { reminderStore, requestNotifications, showTestNotification } from "@/components/ReminderManager";
import { buildReminderIcs, isValidTime } from "@/lib/reminders";
import { useHydrated } from "@/lib/store";
import { toast } from "@/components/Toaster";

export function ReminderSettingsCard() {
  const hydrated = useHydrated();
  const reminder = reminderStore.use();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const toggle = async (enabled: boolean) => {
    reminderStore.set((r) => ({ ...r, enabled }));
    if (!enabled) return;
    const p = await requestNotifications();
    setPermission(p);
    toast(
      p === "granted" ? `Reminder set for ${reminder.time}` : "Reminder on — notifications are blocked, so try the calendar option below",
      p === "granted" ? "⏰" : "🔕"
    );
  };

  const addToCalendar = () => {
    const ics = buildReminderIcs(reminder.time, window.location.origin);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "kaizen-daily-checkin.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Open the file to add a daily reminder to your calendar", "📅");
  };

  return (
    <section className="card space-y-4 p-5" aria-labelledby="reminders-h">
      <div>
        <h2 id="reminders-h" className="font-semibold">⏰ Daily reminder</h2>
        <p className="mt-1 text-sm text-ink-2">A gentle nudge to check in — habits grow from small, consistent steps.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={hydrated && reminder.enabled}
            onChange={(e) => toggle(e.target.checked)}
            disabled={!hydrated}
          />
          Remind me every day at
        </label>
        <input
          type="time"
          className="input w-40 py-1.5"
          value={reminder.time}
          aria-label="Reminder time"
          onChange={(e) => isValidTime(e.target.value) && reminderStore.set((r) => ({ ...r, time: e.target.value }))}
        />
      </div>

      {hydrated && reminder.enabled && (
        <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
          {permission === "granted" ? (
            <p>
              ✅ Browser notifications are on. They arrive while Kaizen is open or installed as an app; some browsers can also
              remind you when it&apos;s closed.{" "}
              <button type="button" className="font-medium text-accent-ink hover:underline" onClick={showTestNotification}>
                Send a test
              </button>
            </p>
          ) : permission === "unsupported" ? (
            <p>This browser doesn&apos;t support notifications — the calendar reminder below works everywhere.</p>
          ) : (
            <p>🔕 Notifications aren&apos;t allowed. You&apos;ll still see a nudge on the home page, or use the calendar reminder.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="button" className="btn btn-ghost" onClick={addToCalendar}>📅 Add to my calendar</button>
        <p className="text-xs text-muted">Most reliable on phones: a repeating event with an alarm at {reminder.time}.</p>
      </div>
    </section>
  );
}
