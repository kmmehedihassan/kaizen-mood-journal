// src/app/api/chat/route.ts
// Kaizen's agentic chat:
//   1. greet on first contact
//   2. explicit quote requests  → navigate tool (client redirects)
//   3. feelings ("I'm stressed") → empathetic reply + matched quote + tiny action + helpful links
//   4. everything else           → LLM (HF / OpenAI / Ollama) with recent history
//   5. no LLM available          → friendly built-in fallback, never a dead end
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db, safeDb } from "@/lib/prisma";
import { exec as navigate } from "@/tools/navigate";
import { complete, type ChatMessage } from "@/lib/llm";
import { detectMood, detectCategoryRequest } from "@/lib/sentiment";
import { MOOD_MAP, MOODS, pickBySeed, type MoodId } from "@/lib/moods";
import { CATEGORY_MAP, QUOTES } from "@/data/quotes";

type Suggestion = { label: string; href: string };
type Reply = { assistantMsg: string; route?: string | null; suggestions?: Suggestion[]; mood?: MoodId | null };

const GREET_RE = /^\s*(hi|hello|hey|yo|hiya|howdy|good (morning|afternoon|evening))\b[\s!.?]*$/i;
// Only treat a message as a mood report when it talks about the speaker's feelings,
// so "what's a good book?" isn't read as "I feel joyful".
const FEELING_RE = /\b(i'?m|i am|i feel|i'?ve been|feeling|feel|felt|i was|me|my|so|today|tonight|lately)\b/i;
const HELP_RE = /\b(help|what can you do|how does this work|features)\b/i;

const SYSTEM_PROMPT = `You are Kaizen, a warm, grounded companion inside a mood-journal web app.
Kaizen means "continuous improvement": you help people get 1% better, one small step at a time.
Style: concise (2-4 sentences), kind, practical, never preachy. Use at most one emoji.
You may suggest the app's features when relevant: the Journal (/journal) for daily check-ins,
the Mood Garden (/garden), Insights (/insights), guided Breathing (/breathe), and Quotes (/quotes).
You are not a therapist. If someone mentions self-harm or being in danger, respond with care and
encourage them to contact local emergency services or a crisis line immediately.`;

const CRISIS_RE = /\b(kill myself|suicid\w*|end my life|self[- ]?harm|hurt myself|want to die)\b/i;

async function save(sessionId: string, role: "user" | "assistant", content: string) {
  await safeDb(async () => {
    await db.session.upsert({ where: { id: sessionId }, update: {}, create: { id: sessionId } });
    await db.message.create({ data: { sessionId, role, content } });
  }, null);
}

function quoteFor(category: string, seed: string) {
  const pool = QUOTES.filter((q) => q.category === category);
  return pickBySeed(pool.length ? pool : QUOTES, seed);
}

export async function POST(request: Request) {
  let body: { sessionId?: unknown; message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId = typeof body.sessionId === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(body.sessionId) ? body.sessionId : null;
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!sessionId || !message) {
    return NextResponse.json({ error: "sessionId and message are required" }, { status: 400 });
  }

  // Client-held history keeps the chat working even without a database.
  const clientHistory: ChatMessage[] = Array.isArray(body.history)
    ? (body.history as { role?: unknown; content?: unknown }[])
        .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 2000) }))
    : [];

  await save(sessionId, "user", message);
  const reply = await respond(message, clientHistory, sessionId);
  await save(sessionId, "assistant", reply.assistantMsg);
  return NextResponse.json(reply);
}

async function respond(message: string, history: ChatMessage[], seed: string): Promise<Reply> {
  // 0. Safety first.
  if (CRISIS_RE.test(message)) {
    return {
      assistantMsg:
        "I'm really glad you told me, and I'm sorry you're carrying this. You deserve support right now — please reach out to a local emergency number or a crisis line (in the US you can call or text 988; findahelpline.com lists lines worldwide). If you can, tell someone near you how you're feeling. 💙",
      suggestions: [{ label: "Breathe with me", href: "/breathe" }],
    };
  }

  // 1. Greeting.
  if (GREET_RE.test(message) && history.filter((m) => m.role === "user").length === 0) {
    return {
      assistantMsg:
        "👋 Hi, I'm Kaizen — your little companion for getting 1% better each day. Tell me how you're feeling, ask for a quote (\"make me laugh\", \"I need motivation\"), or just chat.",
      suggestions: [
        { label: "Check in", href: "/journal" },
        { label: "See my garden", href: "/garden" },
      ],
    };
  }

  // 2. Help.
  if (HELP_RE.test(message) && message.length < 60) {
    return {
      assistantMsg:
        "Here's what I can do: 🌱 log your mood in the Journal, grow a Mood Garden from your check-ins, show Insights on what lifts you up, guide a breathing exercise, and find quotes that fit how you feel. Try telling me \"I'm a bit anxious\" or \"tell me a joke\".",
      suggestions: [
        { label: "Journal", href: "/journal" },
        { label: "Insights", href: "/insights" },
        { label: "Breathe", href: "/breathe" },
      ],
    };
  }

  // 3. Explicit quote request → navigate.
  const category = detectCategoryRequest(message);
  if (category) {
    const meta = CATEGORY_MAP[category];
    const q = quoteFor(category, seed + message);
    return {
      assistantMsg: `${meta.emoji} Here's one to start: “${q.text}” — ${q.author}. Taking you to more ${meta.label.toLowerCase()} quotes…`,
      route: navigate({ target: category }).route,
    };
  }

  // 4. A feeling we can recognise → empathetic, structured help.
  const detected = detectMood(message);
  if (detected.mood && detected.confidence >= 0.45 && message.length < 280 && FEELING_RE.test(message)) {
    const mood = MOOD_MAP[detected.mood];
    const q = quoteFor(mood.categories[0], seed + message);
    const action = pickBySeed(mood.actions, message);

    // Let the LLM personalise, but keep the structured extras either way.
    const ai = await complete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        {
          role: "user",
          content: `${message}\n\n(Context for you: the user seems ${mood.label.toLowerCase()}. Respond empathetically in 2-3 sentences and gently suggest this tiny step: "${action}")`,
        },
      ],
      { maxTokens: 180 }
    );

    const suggestions: Suggestion[] = [];
    if (mood.helper) suggestions.push(mood.helper);
    suggestions.push({ label: `Log “${mood.label}”`, href: `/journal?mood=${mood.id}` });
    suggestions.push({ label: `${CATEGORY_MAP[mood.categories[0]].label} quotes`, href: `/quotes/${mood.categories[0]}` });

    return {
      assistantMsg: `${ai ?? `${mood.emoji} ${mood.note} A tiny step that might help: ${action}`}\n\n“${q.text}” — ${q.author}`,
      suggestions,
      mood: mood.id,
    };
  }

  // 5. Open conversation.
  const ai = await complete([{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }]);
  if (ai) return { assistantMsg: ai };

  // 6. No AI configured / reachable — still be useful.
  const q = pickBySeed(QUOTES, seed + message);
  return {
    assistantMsg: `I'm running in offline mode right now, so my small talk is limited — but here's something to sit with: “${q.text}” — ${q.author}. You can tell me how you feel (e.g. "I'm tired") and I'll suggest something that helps.`,
    suggestions: MOODS.slice(0, 3).map((m) => ({ label: `${m.emoji} I feel ${m.label.toLowerCase()}`, href: `/journal?mood=${m.id}` })),
  };
}
