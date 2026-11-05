// src/components/MilestoneWatcher.tsx
"use client";

// Celebrates newly unlocked milestones with a toast, once each.
import { useEffect } from "react";
import { breathSessionsStore, completedActionsStore, favoritesStore, journalStore, seenMilestonesStore } from "@/lib/journal";
import { computeMilestones } from "@/lib/milestones";
import { toast } from "@/components/Toaster";

export function MilestoneWatcher() {
  const entries = journalStore.use();
  const actions = completedActionsStore.use();
  const breathSessions = breathSessionsStore.use();
  const favorites = favoritesStore.use();

  useEffect(() => {
    const seen = new Set(seenMilestonesStore.get());
    const fresh = computeMilestones({ entries, actions, breathSessions, favorites: favorites.length }).filter(
      (m) => m.unlocked && !seen.has(m.id)
    );
    if (!fresh.length) return;
    seenMilestonesStore.set((prev) => [...new Set([...prev, ...fresh.map((m) => m.id)])]);
    // Small delay so it doesn't collide with the action's own toast.
    setTimeout(() => {
      fresh.slice(0, 2).forEach((m) => toast(`Milestone unlocked: ${m.title}`, m.emoji));
      if (fresh.length > 2) toast(`…and ${fresh.length - 2} more in your garden`, "🏅");
    }, 900);
  }, [entries, actions, breathSessions, favorites]);

  return null;
}
