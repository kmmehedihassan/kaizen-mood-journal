// src/lib/flowerArt.ts
// The single source of truth for how flowers are drawn (64×64 SVG units).
// Used by the on-screen garden and by the shareable garden image.
import type { Mood } from "@/lib/moods";

const r = (n: number) => Math.round(n * 100) / 100;

/** Inner SVG markup for one flower: petals = mood, colour = hue, size = intensity. */
export function flowerMarkup(mood: Mood, intensity = 3): string {
  const scale = 0.6 + intensity * 0.1; // 0.7 … 1.1
  const bloomR = 15 * scale;
  const cx = 32;
  const cy = 24;
  // Unpleasant moods droop slightly — the garden shows the weather of your days.
  const droop = mood.valence < 0 ? 8 : 0;
  const petals = Array.from({ length: mood.petals }, (_, i) => {
    const deg = r((360 / mood.petals) * i);
    return `<ellipse cx="0" cy="${r(-bloomR * 0.55)}" rx="${r(Math.max(2.4, (bloomR * 2.6) / mood.petals))}" ry="${r(bloomR * 0.6)}" transform="rotate(${deg})" fill="hsl(${mood.hue} 80% ${i % 2 ? 66 : 60}%)" stroke="hsl(${mood.hue} 60% 45% / 0.35)" stroke-width="0.6"/>`;
  }).join("");
  return (
    `<path d="M32 64 C 30 52, 34 ${42 + droop / 2}, ${cx} ${cy + droop}" stroke="hsl(${120 + mood.valence * 6} 40% 38%)" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="27" cy="50" rx="5" ry="2.2" transform="rotate(-30 27 50)" fill="hsl(125 40% 45%)"/>` +
    `<g transform="translate(${cx} ${cy + droop}) rotate(${droop * 2})">${petals}` +
    `<circle r="${r(bloomR * 0.32)}" fill="hsl(${(mood.hue + 40) % 360} 85% 55%)"/>` +
    `<circle r="${r(bloomR * 0.14)}" cx="${r(-bloomR * 0.08)}" cy="${r(-bloomR * 0.08)}" fill="hsl(0 0% 100% / 0.6)"/></g>`
  );
}

export const SPROUT_MARKUP =
  `<path d="M32 64 L32 52" stroke="hsl(125 30% 45% / 0.6)" stroke-width="2" stroke-linecap="round"/>` +
  `<ellipse cx="28" cy="51" rx="4" ry="2" transform="rotate(-30 28 51)" fill="hsl(125 35% 50% / 0.5)"/>` +
  `<ellipse cx="36" cy="50" rx="4" ry="2" transform="rotate(30 36 50)" fill="hsl(125 35% 50% / 0.5)"/>`;
