// src/components/ThemeToggle.tsx
"use client";

import { useEffect } from "react";
import { createLocalStore, useHydrated } from "@/lib/store";

type Theme = "light" | "dark" | "system";
export const themeStore = createLocalStore<Theme>("kaizen.theme", "system");

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const ICON: Record<Theme, string> = { system: "🖥️", light: "☀️", dark: "🌙" };

export function ThemeToggle() {
  const theme = themeStore.use();
  const hydrated = useHydrated();

  useEffect(() => {
    apply(theme);
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => themeStore.set(NEXT[theme])}
      className="grid h-9 w-9 place-items-center rounded-full border border-line text-base transition hover:bg-surface-2"
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}
      title={`Theme: ${theme}`}
    >
      <span aria-hidden>{hydrated ? ICON[theme] : ICON.system}</span>
    </button>
  );
}
