// src/lib/moods.ts
// The emotional vocabulary of Kaizen. Every feature (journal, garden, chat,
// quotes, insights) speaks in terms of these moods.

import type { QuoteCategory } from "@/data/quotes";

export type MoodId =
  | "joyful"
  | "grateful"
  | "calm"
  | "energized"
  | "loved"
  | "tired"
  | "anxious"
  | "sad"
  | "angry";

export interface Mood {
  id: MoodId;
  label: string;
  emoji: string;
  /** Hue (0-360) used for the mood's colour across the app. */
  hue: number;
  /** -2 (very unpleasant) … +2 (very pleasant). */
  valence: number;
  /** -2 (low energy) … +2 (high energy). */
  energy: number;
  /** Quote categories that resonate with this mood, best first. */
  categories: QuoteCategory[];
  /** Tiny (≤2 minute) "1% better" actions — the heart of Kaizen. */
  actions: string[];
  /** Number of petals this mood's flower grows in the Mood Garden. */
  petals: number;
  /** A gentle one-line acknowledgement. */
  note: string;
  /** Optional page that particularly helps this mood. */
  helper?: { label: string; href: string };
}

export const MOODS: Mood[] = [
  {
    id: "joyful",
    label: "Joyful",
    emoji: "😄",
    hue: 45,
    valence: 2,
    energy: 1,
    categories: ["funny", "gratitude", "motivational"],
    actions: [
      "Text someone and share what made you smile today.",
      "Write down the moment you'd most like to remember from today.",
      "Put on a song you love and actually listen to the whole thing.",
    ],
    petals: 8,
    note: "Love that for you — let's bottle a little of this feeling.",
  },
  {
    id: "grateful",
    label: "Grateful",
    emoji: "🙏",
    hue: 140,
    valence: 2,
    energy: 0,
    categories: ["gratitude", "wisdom", "romantic"],
    actions: [
      "Name three tiny things that went right today.",
      "Send a two-line thank-you message to someone who helped you.",
      "Notice one thing around you that you usually take for granted.",
    ],
    petals: 6,
    note: "Gratitude is a quiet superpower. Let's note what's good.",
  },
  {
    id: "calm",
    label: "Calm",
    emoji: "😌",
    hue: 190,
    valence: 1,
    energy: -1,
    categories: ["calm", "wisdom", "gratitude"],
    actions: [
      "Take three slow breaths and notice where your body feels relaxed.",
      "Step outside for two minutes and look at the sky.",
      "Write one sentence about what's helping you feel settled.",
    ],
    petals: 5,
    note: "A steady mind is a good place to grow from.",
  },
  {
    id: "energized",
    label: "Energized",
    emoji: "⚡",
    hue: 25,
    valence: 1,
    energy: 2,
    categories: ["motivational", "wisdom", "funny"],
    actions: [
      "Spend the next 10 minutes on the task you've been putting off.",
      "Write tomorrow's single most important task on a sticky note.",
      "Do 10 squats or a quick stretch to channel the energy.",
    ],
    petals: 10,
    note: "Momentum! Let's point it at something that matters.",
  },
  {
    id: "loved",
    label: "Loved",
    emoji: "🥰",
    hue: 335,
    valence: 2,
    energy: 0,
    categories: ["romantic", "gratitude", "funny"],
    actions: [
      "Tell someone one specific thing you appreciate about them.",
      "Write down how this connection makes you feel.",
      "Plan a small kindness for someone you care about this week.",
    ],
    petals: 7,
    note: "Connection is nourishment. Soak it in.",
  },
  {
    id: "tired",
    label: "Tired",
    emoji: "😴",
    hue: 250,
    valence: -1,
    energy: -2,
    categories: ["calm", "funny", "resilience"],
    actions: [
      "Drink a full glass of water right now.",
      "Pick one task to drop or postpone today — guilt-free.",
      "Set an alarm to start winding down 30 minutes earlier tonight.",
    ],
    petals: 4,
    note: "Rest is productive too. Be gentle with yourself.",
    helper: { label: "Try a calming breath", href: "/breathe" },
  },
  {
    id: "anxious",
    label: "Anxious",
    emoji: "😰",
    hue: 280,
    valence: -2,
    energy: 1,
    categories: ["calm", "resilience", "wisdom"],
    actions: [
      "Try one round of box breathing: in 4, hold 4, out 4, hold 4.",
      "Name 5 things you can see, 4 you can hear, 3 you can touch.",
      "Write the worry down, then write the very next small step.",
    ],
    petals: 5,
    note: "That sounds heavy. Let's slow things down together.",
    helper: { label: "Breathe with me", href: "/breathe" },
  },
  {
    id: "sad",
    label: "Sad",
    emoji: "😢",
    hue: 215,
    valence: -2,
    energy: -1,
    categories: ["resilience", "calm", "romantic"],
    actions: [
      "Reach out to one person — even a short 'hey, thinking of you'.",
      "Wrap yourself in something warm and make a hot drink.",
      "Write down one thing that's still okay right now.",
    ],
    petals: 5,
    note: "I'm sorry it's a hard day. Feelings like this pass, like weather.",
    helper: { label: "Read resilience quotes", href: "/quotes/resilience" },
  },
  {
    id: "angry",
    label: "Frustrated",
    emoji: "😤",
    hue: 0,
    valence: -1,
    energy: 2,
    categories: ["calm", "wisdom", "funny"],
    actions: [
      "Walk briskly for five minutes before responding to anything.",
      "Write the angry draft — then don't send it.",
      "Unclench your jaw, drop your shoulders, and exhale slowly.",
    ],
    petals: 9,
    note: "Frustration usually means something matters to you.",
    helper: { label: "Cool down with a breath", href: "/breathe" },
  },
];

export const MOOD_MAP: Record<MoodId, Mood> = Object.fromEntries(
  MOODS.map((m) => [m.id, m])
) as Record<MoodId, Mood>;

export function getMood(id: string | null | undefined): Mood | undefined {
  return id ? MOOD_MAP[id as MoodId] : undefined;
}

export function isMoodId(id: unknown): id is MoodId {
  return typeof id === "string" && id in MOOD_MAP;
}

export function moodColor(mood: Mood, lightness = 60, alpha = 1) {
  return `hsl(${mood.hue} 75% ${lightness}% / ${alpha})`;
}

/** Deterministically pick an item for a seed (e.g. today's date). */
export function pickBySeed<T>(items: T[], seed: string): T {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return items[Math.abs(h) % items.length];
}
