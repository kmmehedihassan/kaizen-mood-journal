// src/lib/reminders.ts — pure helpers (no React), shared by UI and tests.

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:MM", local time
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, time: "20:00" };

export function isValidTime(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Minutes until the next occurrence of `time` (0 < result ≤ 1440). */
export function minutesUntil(time: string, now: Date = new Date()) {
  const [h, m] = time.split(":").map(Number);
  const target = h * 60 + m;
  const cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const diff = target - cur;
  return diff > 0 ? diff : diff + 1440;
}

/** Has today's reminder time passed? */
export function isPastTime(time: string, now: Date = new Date()) {
  const [h, m] = time.split(":").map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * An iCalendar file with a daily repeating check-in event and alarm. Uses a
 * floating local time so it stays at e.g. 20:00 wherever the user is.
 */
export function buildReminderIcs(time: string, siteUrl: string, now: Date = new Date()) {
  const [h, m] = time.split(":").map(Number);
  const start = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(h)}${pad(m)}00`;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = `${siteUrl.replace(/\/$/, "")}/journal`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kaizen//Mood Journal//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:kaizen-daily-checkin-${start}@kaizen`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:🌱 Kaizen check-in",
    `DESCRIPTION:How are you feeling today? Take ten seconds to check in: ${url}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:How are you feeling today?",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
