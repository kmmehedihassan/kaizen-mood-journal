// src/app/api/review/route.ts
// POST a week summary (computed in the browser) → a short, kind weekly review.
// Only the summary and a few short note excerpts are sent, and nothing is stored.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { complete } from "@/lib/llm";
import { builtinReview, sanitizeSummary } from "@/lib/weekly";
import { MOOD_MAP } from "@/lib/moods";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const limit = rateLimit(`review:${clientKey(request)}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many reviews at once — try again in a minute." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const s = sanitizeSummary(raw);
  if (!s) return NextResponse.json({ error: "Invalid summary" }, { status: 400 });
  if (!s.checkIns) return NextResponse.json({ review: builtinReview(s), source: "builtin" });

  const facts = [
    `Week: ${s.start} to ${s.end}. Check-ins: ${s.checkIns} across ${s.daysJournaled} days.`,
    `Average mood (-2 very unpleasant … +2 very pleasant): ${s.avgValence ?? "n/a"}.`,
    `Most frequent moods: ${s.topMoods.map((m) => `${MOOD_MAP[m.mood].label} ×${m.count}`).join(", ") || "n/a"}.`,
    s.bestDay && `Best day: ${s.bestDay.day} (${MOOD_MAP[s.bestDay.mood].label}).`,
    s.hardestDay && `Hardest day: ${s.hardestDay.day} (${MOOD_MAP[s.hardestDay.mood].label}).`,
    s.lifts.length && `Tags that lifted mood: ${s.lifts.join(", ")}.`,
    s.drains.length && `Tags that drained mood: ${s.drains.join(", ")}.`,
    s.gratitude.length && `Gratitude notes: ${s.gratitude.join(" | ")}.`,
    s.notes.length && `Journal excerpts: ${s.notes.join(" | ")}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const ai = await complete(
    [
      {
        role: "system",
        content:
          "You are Kaizen, a warm journaling companion. Write a weekly review in 3-4 short sentences of plain prose (no headings, no lists): " +
          "1) one specific win or bright spot, 2) one pattern worth noticing, kindly framed, 3) ONE concrete, tiny focus for next week starting with 'Your 1% focus:'. " +
          "Refer to days by weekday name. Never diagnose. At most one emoji.",
      },
      { role: "user", content: facts },
    ],
    { maxTokens: 220, temperature: 0.6 }
  );
  return NextResponse.json(ai ? { review: ai, source: "ai" } : { review: builtinReview(s), source: "builtin" });
}
