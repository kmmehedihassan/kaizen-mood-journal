// src/components/garden/MilestonesGrid.tsx
"use client";

import { breathSessionsStore, completedActionsStore, favoritesStore, journalStore } from "@/lib/journal";
import { computeMilestones } from "@/lib/milestones";

export function MilestonesGrid() {
  const milestones = computeMilestones({
    entries: journalStore.use(),
    actions: completedActionsStore.use(),
    breathSessions: breathSessionsStore.use(),
    favorites: favoritesStore.use().length,
  });
  const unlocked = milestones.filter((m) => m.unlocked).length;

  return (
    <section aria-labelledby="milestones-h" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="milestones-h" className="text-xl font-semibold tracking-tight">Milestones</h2>
        <p className="text-sm text-muted">
          {unlocked} of {milestones.length} unlocked
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {milestones.map((m) => (
          <li
            key={m.id}
            className={`card flex flex-col items-center gap-1.5 p-4 text-center transition ${m.unlocked ? "" : "opacity-60"}`}
            title={m.description}
          >
            <span className={`text-3xl ${m.unlocked ? "animate-pop" : "grayscale"}`} aria-hidden>
              {m.emoji}
            </span>
            <p className="text-sm font-semibold leading-tight">{m.title}</p>
            <p className="text-[11px] leading-snug text-muted">{m.description}</p>
            {m.unlocked ? (
              <span className="mt-auto pt-1 text-[11px] font-semibold text-accent-ink">Unlocked ✓</span>
            ) : (
              <span className="mt-auto w-full pt-1">
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(m.current / m.target) * 100}%` }} />
                </span>
                <span className="mt-1 block text-[10px] tabular-nums text-muted">
                  {m.current} / {m.target}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
