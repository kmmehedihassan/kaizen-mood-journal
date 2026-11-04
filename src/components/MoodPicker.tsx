// src/components/MoodPicker.tsx
"use client";

import { MOODS, type MoodId } from "@/lib/moods";

export function MoodPicker({
  value,
  onChange,
  suggested,
  compact,
}: {
  value: MoodId | null;
  onChange: (m: MoodId) => void;
  suggested?: MoodId | null;
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="How are you feeling?" className={`grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-9" : "grid-cols-3"}`}>
      {MOODS.map((m) => {
        const selected = value === m.id;
        const isSuggested = !selected && suggested === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m.id)}
            style={{
              ["--h" as string]: m.hue,
              background: selected ? `hsl(${m.hue} 85% 60% / 0.18)` : undefined,
              borderColor: selected || isSuggested ? `hsl(${m.hue} 70% 55%)` : undefined,
            }}
            className={`relative flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface px-2 transition hover:-translate-y-0.5 hover:shadow-md ${
              compact ? "py-2.5" : "py-4"
            } ${selected ? "shadow-md" : ""} ${isSuggested ? "border-dashed" : ""}`}
          >
            <span className={`${compact ? "text-2xl" : "text-3xl"} transition-transform ${selected ? "scale-125" : ""}`} aria-hidden>
              {m.emoji}
            </span>
            <span className="text-xs font-medium text-ink-2">{m.label}</span>
            {isSuggested && (
              <span className="absolute -top-2 rounded-full bg-surface-solid px-1.5 text-[10px] font-semibold text-muted shadow-sm">
                suggested
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
