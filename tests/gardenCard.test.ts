import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGardenSvg } from "@/lib/gardenCard";
import { flowerMarkup } from "@/lib/flowerArt";
import { MOOD_MAP } from "@/lib/moods";

test("garden card has 35 plots, stats, and escapes text", () => {
  const plots = Array.from({ length: 35 }, (_, i) => ({ day: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`, mood: i % 3 ? ("joyful" as const) : undefined, intensity: 4 }));
  const svg = buildGardenSvg({ plots, streak: 7, flowers: 23, weather: "☀️ Sunny", rangeLabel: "Oct 1 – <Nov 4>" });
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1080" height="1350"/);
  assert.equal((svg.match(/scale\(2\)/g) ?? []).length, 35);
  assert.ok(svg.includes("🔥 7") && svg.includes("🌷 23") && svg.includes("Sunny"));
  assert.ok(svg.includes("&lt;Nov 4&gt;") && !svg.includes("<Nov 4>"));
});

test("flower petals follow the mood and intensity changes size", () => {
  const joy = flowerMarkup(MOOD_MAP.joyful, 3);
  assert.equal((joy.match(/<ellipse cx="0"/g) ?? []).length, MOOD_MAP.joyful.petals);
  assert.notEqual(flowerMarkup(MOOD_MAP.joyful, 1), flowerMarkup(MOOD_MAP.joyful, 5));
  assert.ok(flowerMarkup(MOOD_MAP.sad, 3).includes("rotate(16)"), "sad flowers droop");
});
