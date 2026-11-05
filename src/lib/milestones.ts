// src/lib/milestones.ts — achievements, computed purely from local data.
import { MOODS } from "@/lib/moods";
import { streaks, type JournalEntry } from "@/lib/journal";

export interface MilestoneInput {
  entries: JournalEntry[];
  actions: Record<string, string[]>;
  breathSessions: number;
  favorites: number;
}

export interface Milestone {
  id: string;
  emoji: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
}

type Def = { id: string; emoji: string; title: string; description: string; target: number; value: (d: Derived) => number };
type Derived = MilestoneInput & { longest: number; moodsUsed: number; gratitude: number; reflections: number; steps: number };

const DEFS: Def[] = [
  { id: "first-seed", emoji: "🌱", title: "First seed", description: "Log your very first check-in.", target: 1, value: (d) => d.entries.length },
  { id: "streak-3", emoji: "🔥", title: "Warming up", description: "Check in 3 days in a row.", target: 3, value: (d) => d.longest },
  { id: "streak-7", emoji: "🔥", title: "One full week", description: "Check in 7 days in a row.", target: 7, value: (d) => d.longest },
  { id: "streak-30", emoji: "🏔️", title: "Habit formed", description: "Check in 30 days in a row.", target: 30, value: (d) => d.longest },
  { id: "garden-10", emoji: "🌷", title: "Little garden", description: "Grow 10 flowers.", target: 10, value: (d) => d.entries.length },
  { id: "garden-50", emoji: "🌳", title: "Blooming meadow", description: "Grow 50 flowers.", target: 50, value: (d) => d.entries.length },
  { id: "garden-100", emoji: "🏞️", title: "Secret garden", description: "Grow 100 flowers.", target: 100, value: (d) => d.entries.length },
  { id: "full-spectrum", emoji: "🌈", title: "Full spectrum", description: "Log every one of the 9 moods — all feelings are welcome.", target: MOODS.length, value: (d) => d.moodsUsed },
  { id: "grateful-5", emoji: "🙏", title: "Grateful heart", description: "Write 5 gratitude notes.", target: 5, value: (d) => d.gratitude },
  { id: "grateful-25", emoji: "💛", title: "Abundance", description: "Write 25 gratitude notes.", target: 25, value: (d) => d.gratitude },
  { id: "steps-10", emoji: "✅", title: "Tiny steps", description: "Complete 10 “1% actions”.", target: 10, value: (d) => d.steps },
  { id: "breath-5", emoji: "🫧", title: "Deep breather", description: "Finish 5 breathing sessions.", target: 5, value: (d) => d.breathSessions },
  { id: "reflect-3", emoji: "✨", title: "Looking inward", description: "Ask Kaizen to reflect on 3 entries.", target: 3, value: (d) => d.reflections },
  { id: "words-10", emoji: "✍️", title: "Storyteller", description: "Write notes on 10 check-ins.", target: 10, value: (d) => d.entries.filter((e) => e.note.trim().length >= 20).length },
  { id: "curator", emoji: "💬", title: "Quote curator", description: "Save 10 quotes.", target: 10, value: (d) => d.favorites },
];

export function computeMilestones(input: MilestoneInput): Milestone[] {
  const d: Derived = {
    ...input,
    longest: streaks(input.entries).longest,
    moodsUsed: new Set(input.entries.map((e) => e.mood)).size,
    gratitude: input.entries.filter((e) => e.gratitude).length,
    reflections: input.entries.filter((e) => e.reflection).length,
    steps: Object.values(input.actions).reduce((n, a) => n + a.length, 0),
  };
  return DEFS.map((def) => {
    const current = Math.min(def.target, def.value(d));
    return { id: def.id, emoji: def.emoji, title: def.title, description: def.description, current, target: def.target, unlocked: current >= def.target };
  });
}
