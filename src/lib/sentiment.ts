// src/lib/sentiment.ts
// A tiny, dependency-free emotion detector. Runs on both client (live mood
// suggestions while journaling) and server (chat routing), so it works even
// when no AI provider is configured.

import type { MoodId } from "@/lib/moods";
import type { QuoteCategory } from "@/data/quotes";

const LEXICON: Record<MoodId, string[]> = {
  joyful: ["happy", "joy", "joyful", "great", "awesome", "amazing", "excited", "fantastic", "wonderful", "glad", "delighted", "fun", "yay", "good", "smile", "smiling", "cheerful", "thrilled", "elated", "proud"],
  grateful: ["grateful", "thankful", "thanks", "blessed", "appreciate", "appreciative", "gratitude", "lucky", "fortunate"],
  calm: ["calm", "peaceful", "relaxed", "chill", "serene", "content", "fine", "okay", "ok", "settled", "rested", "quiet", "balanced", "steady"],
  energized: ["energized", "energetic", "motivated", "productive", "pumped", "focused", "determined", "ready", "inspired", "driven", "unstoppable", "hyped"],
  loved: ["loved", "love", "romantic", "crush", "date", "partner", "girlfriend", "boyfriend", "wife", "husband", "hug", "cuddle", "adore", "kiss", "heart", "connected"],
  tired: ["tired", "exhausted", "sleepy", "drained", "burnt", "burned", "burnout", "fatigued", "weary", "lazy", "sluggish", "worn"],
  anxious: ["anxious", "anxiety", "nervous", "worried", "worry", "stressed", "stress", "panic", "panicking", "overwhelmed", "scared", "afraid", "fear", "tense", "uneasy", "restless", "overthinking"],
  sad: ["sad", "down", "depressed", "unhappy", "lonely", "alone", "cry", "crying", "heartbroken", "miserable", "hopeless", "blue", "lost", "empty", "grief", "hurt", "low"],
  angry: ["angry", "mad", "furious", "annoyed", "irritated", "frustrated", "frustrating", "pissed", "rage", "hate", "fed", "resentful", "upset"],
};

const WORD_TO_MOOD = new Map<string, MoodId>();
for (const [mood, words] of Object.entries(LEXICON) as [MoodId, string[]][]) {
  for (const w of words) WORD_TO_MOOD.set(w, mood);
}

const NEGATORS = new Set(["not", "no", "never", "dont", "don't", "isnt", "isn't", "wasnt", "wasn't", "aint", "hardly", "barely", "nor"]);
const INTENSIFIERS = new Set(["very", "so", "really", "extremely", "super", "totally", "incredibly", "too"]);
const POSITIVE: MoodId[] = ["joyful", "grateful", "calm", "energized", "loved"];

export interface MoodDetection {
  mood: MoodId | null;
  confidence: number; // 0..1
  scores: Partial<Record<MoodId, number>>;
}

export function detectMood(text: string): MoodDetection {
  const tokens = text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[^a-z']+/)
    .filter(Boolean);

  const scores: Partial<Record<MoodId, number>> = {};
  let total = 0;

  tokens.forEach((tok, i) => {
    const base = tok.replace(/'s$/, "");
    const mood = WORD_TO_MOOD.get(base);
    if (!mood) return;

    const window = tokens.slice(Math.max(0, i - 3), i);
    const negated = window.some((w) => NEGATORS.has(w) || w.endsWith("n't"));
    const weight = window.some((w) => INTENSIFIERS.has(w)) ? 1.6 : 1;

    // "not happy" → sad, "not worried" → calm
    let target: MoodId = mood;
    if (negated) target = POSITIVE.includes(mood) ? "sad" : "calm";

    scores[target] = (scores[target] ?? 0) + weight;
    total += weight;
  });

  let best: MoodId | null = null;
  let bestScore = 0;
  for (const [m, s] of Object.entries(scores) as [MoodId, number][]) {
    if (s > bestScore) {
      best = m;
      bestScore = s;
    }
  }

  return {
    mood: best,
    confidence: total ? Math.min(1, (bestScore / total) * Math.min(1, total / 1.5)) : 0,
    scores,
  };
}

/** Explicit requests for a quote category, e.g. "tell me a joke". */
export function detectCategoryRequest(text: string): QuoteCategory | null {
  const t = text.toLowerCase();
  if (/\b(romantic|romance|love quote|something sweet|darling)\b/.test(t)) return "romantic";
  if (/\b(funny|joke|jokes|lol|haha|laugh|silly|comic|make me smile)\b/.test(t)) return "funny";
  if (/\b(motivat\w*|inspire|inspiration|pump me up|push me)\b/.test(t)) return "motivational";
  if (/\b(gratitude|grateful quote|thankful quote)\b/.test(t)) return "gratitude";
  if (/\b(resilien\w*|strength|keep going|hope)\b/.test(t)) return "resilience";
  if (/\b(calm(ing)? quote|peace|relax(ing)? quote|mindful\w*)\b/.test(t)) return "calm";
  if (/\b(wisdom|kaizen|philosoph\w*|wise)\b/.test(t)) return "wisdom";
  return null;
}
