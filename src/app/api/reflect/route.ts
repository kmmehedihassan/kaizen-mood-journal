// src/app/api/reflect/route.ts
// POST { mood, intensity, note, tags } → a short, kind reflection on a journal entry.
// Journal content is sent only when the user presses "Reflect", and is not stored.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { complete } from "@/lib/llm";
import { MOOD_MAP, isMoodId, pickBySeed } from "@/lib/moods";
import { QUOTES } from "@/data/quotes";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isMoodId(body.mood)) return NextResponse.json({ error: "Unknown mood" }, { status: 400 });

  const mood = MOOD_MAP[body.mood];
  const intensity = Math.min(5, Math.max(1, Number(body.intensity) || 3));
  const note = typeof body.note === "string" ? body.note.slice(0, 1500) : "";
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === "string").slice(0, 10).join(", ") : "";

  const ai = await complete(
    [
      {
        role: "system",
        content:
          "You are Kaizen, a kind journaling companion. Given a journal entry, write a reflection of at most 3 short sentences: " +
          "1) acknowledge the feeling specifically, 2) offer one gentle reframe or insight, 3) suggest ONE tiny action (under 2 minutes). " +
          "No headings, no lists, no diagnosis. Plain text.",
      },
      {
        role: "user",
        content: `Mood: ${mood.label} (intensity ${intensity}/5)\nTags: ${tags || "none"}\nEntry: ${note || "(no note)"}`,
      },
    ],
    { maxTokens: 160, temperature: 0.6 }
  );

  if (ai) return NextResponse.json({ reflection: ai, source: "ai" });

  // Thoughtful built-in fallback.
  const seed = `${mood.id}${note}`;
  const action = pickBySeed(mood.actions, seed);
  const quotePool = QUOTES.filter((q) => q.category === mood.categories[0]);
  const quote = pickBySeed(quotePool, seed);
  const intensityWord = intensity >= 4 ? "strongly" : intensity <= 2 ? "a little" : "noticeably";
  const reflection =
    mood.valence >= 1
      ? `You're feeling ${intensityWord} ${mood.label.toLowerCase()} — worth pausing to notice what helped create that. ${action} “${quote.text}” — ${quote.author}`
      : `Feeling ${intensityWord} ${mood.label.toLowerCase()} is valid, and naming it is already a step forward. ${action} “${quote.text}” — ${quote.author}`;
  return NextResponse.json({ reflection, source: "builtin" });
}
