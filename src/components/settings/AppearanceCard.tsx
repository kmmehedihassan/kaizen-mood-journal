// src/components/settings/AppearanceCard.tsx
"use client";

import { themeStore } from "@/components/ThemeToggle";
import { useHydrated } from "@/lib/store";

const OPTIONS = [
  { id: "system", label: "🖥️ System" },
  { id: "light", label: "☀️ Light" },
  { id: "dark", label: "🌙 Dark" },
] as const;

export function AppearanceCard() {
  const theme = themeStore.use();
  const hydrated = useHydrated();
  return (
    <section className="card space-y-4 p-5" aria-labelledby="appearance-h">
      <h2 id="appearance-h" className="font-semibold">🎨 Appearance</h2>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={hydrated && theme === o.id}
            className="chip px-4 py-2"
            onClick={() => themeStore.set(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-2">Accent colours follow your most recent mood automatically.</p>
    </section>
  );
}
