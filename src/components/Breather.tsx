// src/components/Breather.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SOUNDSCAPES, playSoundscape, setSoundscapeVolume, stopSoundscape, type Soundscape } from "@/lib/ambient";
import { breathSessionsStore } from "@/lib/journal";
import { createLocalStore, useHydrated } from "@/lib/store";

const soundPrefStore = createLocalStore<{ sound: Soundscape; volume: number }>("kaizen.sound.v1", { sound: "off", volume: 0.5 });

type Phase = { name: "Breathe in" | "Hold" | "Breathe out"; secs: number; scale: number };
type Pattern = { id: string; name: string; blurb: string; phases: Phase[] };

const PATTERNS: Pattern[] = [
  {
    id: "box",
    name: "Box breathing",
    blurb: "4 · 4 · 4 · 4 — steadies the mind under pressure.",
    phases: [
      { name: "Breathe in", secs: 4, scale: 1 },
      { name: "Hold", secs: 4, scale: 1 },
      { name: "Breathe out", secs: 4, scale: 0.55 },
      { name: "Hold", secs: 4, scale: 0.55 },
    ],
  },
  {
    id: "478",
    name: "4-7-8",
    blurb: "A long exhale to help you wind down or fall asleep.",
    phases: [
      { name: "Breathe in", secs: 4, scale: 1 },
      { name: "Hold", secs: 7, scale: 1 },
      { name: "Breathe out", secs: 8, scale: 0.55 },
    ],
  },
  {
    id: "coherent",
    name: "Coherent",
    blurb: "Even 5.5-second breaths — gentle and balancing.",
    phases: [
      { name: "Breathe in", secs: 5.5, scale: 1 },
      { name: "Breathe out", secs: 5.5, scale: 0.55 },
    ],
  },
];

const DURATIONS = [1, 3, 5];

export function Breather() {
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [minutes, setMinutes] = useState(3);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const pref = soundPrefStore.use();
  const hydrated = useHydrated();
  const [soundOn, setSoundOn] = useState(false);

  // Stop audio when leaving the page.
  useEffect(() => () => void stopSoundscape(), []);

  const chooseSound = (sound: Soundscape) => {
    soundPrefStore.set((p) => ({ ...p, sound }));
    if (sound === "off") {
      setSoundOn(false);
      void stopSoundscape();
    } else {
      setSoundOn(true);
      void playSoundscape(sound, pref.volume);
    }
  };

  const phase = pattern.phases[phaseIdx];
  const total = minutes * 60;

  useEffect(() => {
    if (!running) return;
    let idx = 0;
    let remaining = pattern.phases[0].secs;
    let el = 0;
    setPhaseIdx(0);
    setLeft(remaining);
    setElapsed(0);
    tick.current = setInterval(() => {
      remaining -= 0.5;
      el += 0.5;
      if (el >= total) {
        clearInterval(tick.current);
        setRunning(false);
        setFinished(true);
        breathSessionsStore.set((n) => n + 1);
        if ("vibrate" in navigator) navigator.vibrate?.(200);
        return;
      }
      if (remaining <= 0) {
        idx = (idx + 1) % pattern.phases.length;
        remaining = pattern.phases[idx].secs;
        setPhaseIdx(idx);
        if ("vibrate" in navigator) navigator.vibrate?.(30);
      }
      setLeft(remaining);
      setElapsed(el);
    }, 500);
    return () => clearInterval(tick.current);
  }, [running, pattern, total]);

  const start = () => {
    setFinished(false);
    setRunning(true);
    // Resume the chosen soundscape (starting audio needs this click).
    if (pref.sound !== "off" && !soundOn) {
      setSoundOn(true);
      void playSoundscape(pref.sound, pref.volume);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 text-center">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Breathe</h1>
        <p className="text-ink-2">Follow the orb. Expand as you breathe in, soften as you breathe out.</p>
      </header>

      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Breathing pattern">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === pattern.id}
            className="chip"
            disabled={running}
            onClick={() => setPattern(p)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{pattern.blurb}</p>

      <div className="relative mx-auto grid aspect-square w-full max-w-sm place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--border)" strokeWidth="1" />
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 48}
            strokeDashoffset={2 * Math.PI * 48 * (1 - elapsed / total)}
            style={{ transition: "stroke-dashoffset 0.5s linear" }}
          />
        </svg>
        <div
          className="orb h-3/4 w-3/4"
          style={{
            transform: `scale(${running ? phase.scale : 0.7})`,
            transition: `transform ${running ? phase.secs : 1}s ${phase.name === "Hold" ? "linear" : "ease-in-out"}`,
          }}
        />
        <div className="pointer-events-none absolute text-center" aria-live="polite">
          {running ? (
            <>
              <p className="text-2xl font-semibold text-ink drop-shadow-sm">{phase.name}</p>
              <p className="text-4xl font-light tabular-nums text-ink">{Math.ceil(left)}</p>
            </>
          ) : finished ? (
            <p className="text-2xl font-semibold text-ink">Well done 🌿</p>
          ) : (
            <p className="text-lg font-medium text-ink">Ready when you are</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!running && (
          <div className="flex gap-1" role="group" aria-label="Duration">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={minutes === d} onClick={() => setMinutes(d)}>
                {d} min
              </button>
            ))}
          </div>
        )}
        {running ? (
          <button type="button" className="btn btn-ghost" onClick={() => setRunning(false)}>Stop</button>
        ) : (
          <button type="button" className="btn btn-primary px-8" onClick={start}>{finished ? "Again" : "Begin"}</button>
        )}
      </div>

      <div className="card mx-auto max-w-md space-y-3 p-4">
        <div className="flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Background sound">
          {SOUNDSCAPES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              role="radio"
              aria-checked={hydrated && (sc.id === "off" ? !soundOn : soundOn && pref.sound === sc.id)}
              className="chip"
              onClick={() => chooseSound(sc.id)}
            >
              <span aria-hidden>{sc.emoji}</span> {sc.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-xs text-muted">
          <span aria-hidden>🔈</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={pref.volume}
            aria-label="Volume"
            className="flex-1"
            onChange={(e) => {
              const volume = Number(e.target.value);
              soundPrefStore.set((p) => ({ ...p, volume }));
              if (soundOn) setSoundscapeVolume(volume);
            }}
          />
          <span aria-hidden>🔊</span>
        </label>
      </div>

      {finished && (
        <div className="card animate-rise mx-auto max-w-md space-y-3 p-5">
          <p className="font-medium">How do you feel now?</p>
          <div className="flex justify-center gap-2">
            <Link href="/journal?mood=calm" className="btn btn-ghost">😌 Calmer</Link>
            <Link href="/journal" className="btn btn-ghost">📓 Log it</Link>
          </div>
        </div>
      )}
    </div>
  );
}
