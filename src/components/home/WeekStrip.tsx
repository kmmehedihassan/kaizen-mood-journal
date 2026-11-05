// src/components/home/WeekStrip.tsx
"use client";

import Link from "next/link";
import { Flower, Sprout } from "@/components/Flower";
import { byDay, journalStore } from "@/lib/journal";
import { MOOD_MAP } from "@/lib/moods";
import { formatDay, lastNDays, dayKey } from "@/lib/dates";
import { useHydrated } from "@/lib/store";

export function WeekStrip() {
  const entries = journalStore.use();
  const hydrated = useHydrated();
  const days = byDay(entries);
  const keys = hydrated ? lastNDays(7) : [];
  const today = hydrated ? dayKey() : "";

  return (
    <div className="card grid grid-cols-7 gap-1 p-3 sm:p-5">
      {(hydrated ? keys : Array.from({ length: 7 }, (_, i) => String(i))).map((k) => {
        const list = days.get(k) ?? [];
        const top = list.slice().sort((a, b) => b.intensity - a.intensity)[0];
        return (
          <Link
            key={k}
            href={top ? "/garden" : "/journal"}
            className={`flex flex-col items-center rounded-xl py-2 transition hover:bg-surface-2 ${k === today ? "bg-accent-soft/60" : ""}`}
            aria-label={hydrated ? `${formatDay(k)}: ${top ? MOOD_MAP[top.mood].label : "no check-in"}` : undefined}
          >
            <div className="h-12 w-12 sm:h-16 sm:w-16">
              {top ? <Flower mood={MOOD_MAP[top.mood]} intensity={top.intensity} size={64} /> : <Sprout size={64} />}
            </div>
            <span className="mt-1 text-[11px] font-medium text-muted">
              {hydrated ? (k === today ? "Today" : formatDay(k, { weekday: "short" })) : "·"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
