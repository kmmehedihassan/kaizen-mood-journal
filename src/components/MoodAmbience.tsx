// src/components/MoodAmbience.tsx
"use client";

// Keeps the app's colour in tune with the user's most recent mood.
import { useEffect } from "react";
import { currentMoodStore } from "@/lib/journal";
import { getMood } from "@/lib/moods";

export function MoodAmbience() {
  const moodId = currentMoodStore.use();
  useEffect(() => {
    const mood = getMood(moodId);
    document.documentElement.style.setProperty("--mood-hue", String(mood?.hue ?? 160));
  }, [moodId]);
  return null;
}
