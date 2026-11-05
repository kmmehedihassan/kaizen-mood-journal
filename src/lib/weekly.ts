// src/lib/weekly.ts — summarise the last 7 days (pure; used by UI, API and tests).
import { MOOD_MAP, isMoodId, type MoodId } from "@/lib/moods";
import { addDays, dayKey } from "@/lib/dates";
import type { JournalEntry } from "@/lib/journal";

export interface WeekSummary {
  start: string;
  end: string;
  checkIns: number;
  daysJournaled: number;
  avgValence: number | null; // -2..2
  topMoods: { mood: MoodId; count: number }[];
  bestDay: { day: string; mood: MoodId } | null;
  hardestDay: { day: string; mood: MoodId } | null;
  lifts: string[];
  drains: string[];
  gratitude: string[];
  notes: string[];
}

export function summarizeWeek(entries: JournalEntry[], end: Date = new Date()): WeekSummary {
  const days = new Set(Array.from({ length: 7 }, (_, i) => dayKey(addDays(end, -i))));
  const week = entries.filter((e) => days.has(e.day));
  const val = (e: JournalEntry) => MOOD_MAP[e.mood].valence;

  const counts = new Map<MoodId, number>();
  for (const e of week) counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1);

  const byDay = new Map<string, JournalEntry[]>();
  for (const e of week) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const dayScores = [...byDay.entries()].map(([day, list]) => {
    const top = [...list].sort((a, b) => b.intensity - a.intensity)[0];
    return { day, mood: top.mood, score: list.reduce((s, e) => s + val(e), 0) / list.length };
  });
  dayScores.sort((a, b) => b.score - a.score || a.day.localeCompare(b.day));

  const avg = week.length ? week.reduce((s, e) => s + val(e), 0) / week.length : null;
  const tagScores = new Map<string, number[]>();
  for (const e of week) for (const t of e.tags) tagScores.set(t, [...(tagScores.get(t) ?? []), val(e)]);
  const tagDelta = [...tagScores.entries()]
    .filter(([, v]) => v.length >= 2 && avg !== null)
    .map(([t, v]) => ({ t, d: v.reduce((a, b) => a + b, 0) / v.length - (avg ?? 0) }))
    .sort((a, b) => b.d - a.d);

  return {
    start: dayKey(addDays(end, -6)),
    end: dayKey(end),
    checkIns: week.length,
    daysJournaled: byDay.size,
    avgValence: avg === null ? null : Math.round(avg * 100) / 100,
    topMoods: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([mood, count]) => ({ mood, count })),
    bestDay: dayScores.length ? { day: dayScores[0].day, mood: dayScores[0].mood } : null,
    hardestDay: dayScores.length > 1 ? { day: dayScores.at(-1)!.day, mood: dayScores.at(-1)!.mood } : null,
    lifts: tagDelta.filter((x) => x.d > 0.2).slice(0, 3).map((x) => x.t),
    drains: tagDelta.filter((x) => x.d < -0.2).slice(-3).reverse().map((x) => x.t),
    gratitude: week.filter((e) => e.gratitude).slice(0, 4).map((e) => e.gratitude!.slice(0, 120)),
    notes: week.filter((e) => e.note).slice(0, 7).map((e) => `${MOOD_MAP[e.mood].label}: ${e.note.slice(0, 160)}`),
  };
}

const dayName = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
};

/** Readable review without AI — also the fallback when no provider is configured. */
export function builtinReview(s: WeekSummary): string {
  if (!s.checkIns) return "No check-ins this week yet. Even one ten-second check-in gives you something to learn from next week. 🌱";
  const parts: string[] = [];
  const mood = s.topMoods[0] && MOOD_MAP[s.topMoods[0].mood];
  const tone =
    s.avgValence === null ? "" : s.avgValence > 0.8 ? "a bright week" : s.avgValence > 0 ? "a mostly good week" : s.avgValence > -0.8 ? "a mixed week" : "a heavy week";
  parts.push(
    `You checked in ${s.checkIns} time${s.checkIns === 1 ? "" : "s"} across ${s.daysJournaled} day${s.daysJournaled === 1 ? "" : "s"} — ${tone}${
      mood ? `, with ${mood.label.toLowerCase()} ${mood.emoji} showing up most` : ""
    }.`
  );
  if (s.bestDay) parts.push(`${dayName(s.bestDay.day)} stood out as your best day${s.lifts.length ? `, and #${s.lifts[0]} seemed to lift you` : ""}.`);
  if (s.hardestDay && s.hardestDay.day !== s.bestDay?.day)
    parts.push(`${dayName(s.hardestDay.day)} was harder${s.drains.length ? ` — #${s.drains[0]} tends to drain you` : ""}; be gentle with yourself there.`);
  const focus =
    s.daysJournaled < 4
      ? "check in on at least four days next week, even with a single word"
      : s.drains.length
        ? `plan one small buffer around #${s.drains[0]} next week`
        : s.lifts.length
          ? `make room for more #${s.lifts[0]} next week`
          : "add a tag or two to your check-ins so patterns can emerge";
  parts.push(`Your 1% focus: ${focus}.`);
  return parts.join(" ");
}

/** Validate and clamp a summary that arrived from a client. */
export function sanitizeSummary(raw: unknown): WeekSummary | null {
  const r = raw as Partial<WeekSummary> | null;
  if (!r || typeof r !== "object") return null;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const strs = (v: unknown, k: number, n: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, k).map((x) => x.slice(0, n)) : []);
  const dayRe = /^\d{4}-\d{2}-\d{2}$/;
  const dm = (v: unknown) => {
    const o = v as { day?: unknown; mood?: unknown } | null;
    return o && typeof o.day === "string" && dayRe.test(o.day) && isMoodId(o.mood) ? { day: o.day, mood: o.mood } : null;
  };
  const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);
  return {
    start: dayRe.test(str(r.start, 10)) ? str(r.start, 10) : "",
    end: dayRe.test(str(r.end, 10)) ? str(r.end, 10) : "",
    checkIns: Math.round(num(r.checkIns, 0, 500)),
    daysJournaled: Math.round(num(r.daysJournaled, 0, 7)),
    avgValence: typeof r.avgValence === "number" ? num(r.avgValence, -2, 2) : null,
    topMoods: Array.isArray(r.topMoods)
      ? r.topMoods.filter((m) => isMoodId(m?.mood)).slice(0, 3).map((m) => ({ mood: m.mood, count: Math.round(num(m.count, 0, 500)) }))
      : [],
    bestDay: dm(r.bestDay),
    hardestDay: dm(r.hardestDay),
    lifts: strs(r.lifts, 3, 30),
    drains: strs(r.drains, 3, 30),
    gratitude: strs(r.gratitude, 4, 120),
    notes: strs(r.notes, 7, 180),
  };
}
