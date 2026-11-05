// src/components/garden/GardenClient.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { MilestonesGrid } from "@/components/garden/MilestonesGrid";
import { buildGardenSvg, svgToPng } from "@/lib/gardenCard";
import { Flower, Sprout } from "@/components/Flower";
import { toast } from "@/components/Toaster";
import { byDay, dayValence, journalStore, seedDemoData, streaks, type JournalEntry } from "@/lib/journal";
import { MOODS, MOOD_MAP } from "@/lib/moods";
import { addDays, dayKey, formatDay, lastNDays, parseDayKey } from "@/lib/dates";
import { useHydrated } from "@/lib/store";

function weather(v: number | null) {
  if (v === null) return { icon: "🌫️", label: "Unknown skies", text: "Check in a few times to see your mood weather." };
  if (v > 1) return { icon: "☀️", label: "Sunny", text: "A bright stretch. Notice what's been feeding it." };
  if (v > 0.3) return { icon: "🌤️", label: "Mostly sunny", text: "More good days than hard ones lately." };
  if (v > -0.3) return { icon: "⛅", label: "Mixed skies", text: "Ups and downs — completely normal." };
  if (v > -1) return { icon: "🌧️", label: "Showers", text: "A bit heavy lately. Rain helps gardens grow, too." };
  return { icon: "⛈️", label: "Stormy", text: "It's been tough. Be gentle with yourself, and reach out if you need to." };
}

const pickTop = (list: JournalEntry[]) => list.slice().sort((a, b) => b.intensity - a.intensity || b.createdAt - a.createdAt)[0];

export function GardenClient() {
  const hydrated = useHydrated();
  const entries = journalStore.use();
  const [selected, setSelected] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  if (!hydrated) return <div className="card h-[32rem] animate-pulse" />;

  const days = byDay(entries);
  const plotDays = lastNDays(35);
  const recent = lastNDays(7).flatMap((k) => days.get(k) ?? []);
  const w = weather(dayValence(recent));
  const { current, totalDays } = streaks(entries);
  const sel = selected ? days.get(selected) ?? [] : [];

  const shareGarden = async () => {
    setSharing(true);
    try {
      const svg = buildGardenSvg({
        plots: plotDays.map((k) => {
          const list = days.get(k);
          const top = list?.length ? pickTop(list) : null;
          return { day: k, mood: top?.mood, intensity: top?.intensity };
        }),
        streak: current,
        flowers: entries.length,
        weather: `${w.icon} ${w.label}`,
        rangeLabel: `${formatDay(plotDays[0], { month: "short", day: "numeric" })} – ${formatDay(plotDays.at(-1)!, { month: "short", day: "numeric", year: "numeric" })}`,
      });
      const blob = await svgToPng(svg);
      const file = new File([blob], `kaizen-garden-${dayKey()}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Mood Garden", text: "Growing 1% at a time 🌱" }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Garden image downloaded", "🖼️");
      }
    } catch {
      toast("Couldn't create the image in this browser", "⚠️");
    } finally {
      setSharing(false);
    }
  };

  // Year in pixels: 26 weeks, columns = weeks, rows = weekdays (Sun..Sat).
  const today = new Date();
  const start = addDays(today, -(7 * 25 + today.getDay()));
  const weeks = Array.from({ length: 26 }, (_, wi) => Array.from({ length: 7 }, (_, di) => addDays(start, wi * 7 + di)));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight">Mood Garden</h1>
          <p className="mt-1 text-ink-2">
            Every check-in plants a flower. Petals and colour come from your mood, size from its intensity — so your garden is a living portrait of
            your last five weeks.
          </p>
        </div>
        <div className="card flex items-center gap-4 px-5 py-4" aria-label={`Mood weather: ${w.label}`}>
          <span className="animate-float text-4xl" aria-hidden>{w.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">This week&apos;s weather</p>
            <p className="font-semibold">{w.label}</p>
            <p className="max-w-56 text-xs text-ink-2">{w.text}</p>
          </div>
        </div>
      </header>

      <section aria-label="Garden of the last 35 days" className="card relative overflow-hidden p-4 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
          style={{ background: "linear-gradient(to top, hsl(30 35% 45% / 0.18), transparent)" }}
        />
        <div className="relative grid grid-cols-7 gap-x-1 gap-y-3">
          {plotDays.map((k, i) => {
            const list = days.get(k) ?? [];
            const top = list.length ? pickTop(list) : null;
            const isToday = k === dayKey();
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelected(k === selected ? null : k)}
                aria-pressed={selected === k}
                aria-label={`${formatDay(k)}: ${top ? `${list.length} check-in${list.length > 1 ? "s" : ""}, ${MOOD_MAP[top.mood].label}` : "no check-in"}`}
                className={`group relative flex flex-col items-center rounded-2xl pt-1 transition hover:bg-surface-2 ${
                  selected === k ? "bg-accent-soft" : ""
                } ${isToday ? "ring-2 ring-accent/60" : ""}`}
              >
                <div className="aspect-square w-full max-w-20">
                  {top ? (
                    <Flower mood={MOOD_MAP[top.mood]} intensity={top.intensity} size={80} delay={(i % 7) * 0.3} />
                  ) : (
                    <Sprout size={80} />
                  )}
                </div>
                {list.length > 1 && (
                  <span className="absolute right-1 top-1 rounded-full bg-surface-solid px-1.5 text-[10px] font-semibold text-muted shadow-sm">
                    ×{list.length}
                  </span>
                )}
                <span className="pb-1 text-[10px] text-muted tabular-nums">{parseDayKey(k).getDate()}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="animate-rise relative mt-4 rounded-2xl border border-line bg-surface-solid p-4">
            <p className="text-sm font-semibold">{formatDay(selected, { weekday: "long", month: "long", day: "numeric" })}</p>
            {sel.length ? (
              <ul className="mt-2 space-y-2">
                {sel.map((e) => (
                  <li key={e.id} className="flex gap-2 text-sm">
                    <span aria-hidden>{MOOD_MAP[e.mood].emoji}</span>
                    <span>
                      <strong className="font-medium">{MOOD_MAP[e.mood].label}</strong>
                      {e.note && <span className="text-ink-2"> — {e.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink-2">
                Nothing planted this day. <Link href="/journal" className="text-accent-ink hover:underline">Check in now →</Link>
              </p>
            )}
          </div>
        )}
      </section>

      {entries.length > 0 && (
        <div className="-mt-6 flex justify-end">
          <button type="button" className="btn btn-ghost" onClick={shareGarden} disabled={sharing}>
            {sharing ? "Painting…" : "🖼️ Share my garden"}
          </button>
        </div>
      )}

      {entries.length === 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-ink-2">Your garden is waiting for its first seed.</p>
          <div className="flex gap-2">
            <Link href="/journal" className="btn btn-primary">Plant your first flower</Link>
            <button type="button" className="btn btn-ghost" onClick={() => toast(`Planted ${seedDemoData()} demo check-ins`, "🌷")}>
              Demo garden
            </button>
          </div>
        </div>
      )}

      <section aria-labelledby="pixels" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="pixels" className="text-xl font-semibold tracking-tight">Six months in pixels</h2>
          <p className="text-sm text-muted">
            {totalDays} days tended · {current}-day streak
          </p>
        </div>
        <div className="card overflow-x-auto p-4">
          <div className="flex min-w-max gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((d) => {
                  const k = dayKey(d);
                  const future = d > today;
                  const list = days.get(k);
                  const top = list ? pickTop(list) : null;
                  const m = top ? MOOD_MAP[top.mood] : null;
                  return (
                    <span
                      key={k}
                      title={future ? undefined : `${formatDay(k)}${m ? ` · ${m.emoji} ${m.label}` : ""}`}
                      className="h-3.5 w-3.5 rounded-[4px]"
                      style={{
                        background: future ? "transparent" : m ? `hsl(${m.hue} 75% ${70 - top!.intensity * 4}%)` : "var(--surface-2)",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2" aria-label="Legend">
          {MOODS.map((m) => (
            <li key={m.id} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[3px]" style={{ background: `hsl(${m.hue} 75% 58%)` }} />
              {m.emoji} {m.label}
            </li>
          ))}
        </ul>
      </section>

      <MilestonesGrid />
    </div>
  );
}
