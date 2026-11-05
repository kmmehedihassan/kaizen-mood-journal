// src/lib/gardenCard.ts — build the shareable Mood Garden image.
import { MOOD_MAP, type MoodId } from "@/lib/moods";
import { SPROUT_MARKUP, flowerMarkup } from "@/lib/flowerArt";

export interface GardenPlot {
  day: string; // YYYY-MM-DD
  mood?: MoodId;
  intensity?: number;
}

export interface GardenCardInput {
  plots: GardenPlot[]; // 35 days, oldest first
  streak: number;
  flowers: number;
  weather: string; // e.g. "☀️ Sunny"
  rangeLabel: string; // e.g. "Oct 2 – Nov 5"
}

const W = 1080;
const H = 1350;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function buildGardenSvg({ plots, streak, flowers, weather, rangeLabel }: GardenCardInput): string {
  const cols = 7;
  const cell = 136;
  const rowH = 160;
  const x0 = (W - cols * cell) / 2;
  const y0 = 232;

  const cells = plots
    .slice(-35)
    .map((p, i) => {
      const x = x0 + (i % cols) * cell;
      const y = y0 + Math.floor(i / cols) * rowH;
      const mood = p.mood ? MOOD_MAP[p.mood] : undefined;
      const art = mood ? flowerMarkup(mood, p.intensity ?? 3) : SPROUT_MARKUP;
      const dayNum = Number(p.day.slice(8, 10));
      return (
        `<g transform="translate(${x + 4} ${y}) scale(2)">${art}</g>` +
        `<text x="${x + cell / 2}" y="${y + 148}" text-anchor="middle" font-size="20" fill="#7a7f87" font-family="system-ui, sans-serif">${dayNum}</text>`
      );
    })
    .join("");

  const stat = (x: number, big: string, small: string) =>
    `<text x="${x}" y="1145" text-anchor="middle" font-size="46" font-weight="700" fill="#24303a" font-family="system-ui, sans-serif">${esc(big)}</text>` +
    `<text x="${x}" y="1187" text-anchor="middle" font-size="24" fill="#6b7280" font-family="system-ui, sans-serif">${esc(small)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f3f8ff"/><stop offset="0.62" stop-color="#f7fbf3"/><stop offset="1" stop-color="#efe6d8"/>
  </linearGradient>
  <radialGradient id="sun" cx="0.85" cy="0.08" r="0.35"><stop offset="0" stop-color="#ffe9a8" stop-opacity="0.9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" fill="url(#sun)"/>
<text x="${W / 2}" y="130" text-anchor="middle" font-size="68" font-style="italic" fill="#24303a" font-family="Georgia, 'Times New Roman', serif">My Mood Garden</text>
<text x="${W / 2}" y="185" text-anchor="middle" font-size="28" fill="#6b7280" font-family="system-ui, sans-serif">${esc(rangeLabel)}</text>
${cells}
<line x1="120" y1="1065" x2="${W - 120}" y2="1065" stroke="#d9cfbf" stroke-width="2"/>
${stat(W / 2 - 300, `🔥 ${streak}`, "day streak")}
${stat(W / 2, `🌷 ${flowers}`, "flowers grown")}
${stat(W / 2 + 300, weather.split(" ")[0] ?? "", weather.split(" ").slice(1).join(" ") || "weather")}
<text x="${W / 2}" y="1290" text-anchor="middle" font-size="26" fill="#6b7280" font-family="system-ui, sans-serif">🌱 Kaizen · get 1% better every day</text>
</svg>`;
}

/** Rasterise the SVG to a PNG blob (browser only). */
export async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Couldn't render image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.getContext("2d")!.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
