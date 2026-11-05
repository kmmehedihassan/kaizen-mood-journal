import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReminderIcs, isPastTime, isValidTime, minutesUntil } from "@/lib/reminders";

test("validates HH:MM times", () => {
  assert.ok(isValidTime("08:05"));
  assert.ok(isValidTime("23:59"));
  assert.equal(isValidTime("24:00"), false);
  assert.equal(isValidTime("8:5"), false);
});

test("minutesUntil wraps to tomorrow", () => {
  const now = new Date(2026, 10, 5, 19, 0, 0);
  assert.equal(minutesUntil("20:00", now), 60);
  assert.equal(minutesUntil("18:00", now), 23 * 60);
  assert.equal(minutesUntil("19:00", now), 24 * 60);
  assert.ok(isPastTime("18:30", now));
  assert.equal(isPastTime("19:01", now), false);
});

test("calendar file is a valid daily repeating event with an alarm", () => {
  const ics = buildReminderIcs("20:30", "https://example.com/", new Date(2026, 10, 5, 9));
  const lines = ics.split("\r\n");
  assert.equal(lines[0], "BEGIN:VCALENDAR");
  assert.ok(lines.includes("DTSTART:20261105T203000"));
  assert.ok(lines.includes("RRULE:FREQ=DAILY"));
  assert.ok(lines.includes("BEGIN:VALARM"));
  assert.ok(lines.includes("URL:https://example.com/journal"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});
