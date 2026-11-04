// src/components/QuoteCard.tsx
"use client";

import { useState } from "react";
import { CATEGORY_MAP, isCategory, type Quote } from "@/data/quotes";
import { favoritesStore, toggleFavorite } from "@/lib/journal";
import { useHydrated } from "@/lib/store";
import { toast } from "@/components/Toaster";

export type QuoteCardProps = Quote & { featured?: boolean; style?: React.CSSProperties };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Render the quote as a shareable 1080×1080 image. */
async function downloadImage(q: Quote, hue: number) {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, `hsl(${hue} 70% 92%)`);
  g.addColorStop(1, `hsl(${(hue + 50) % 360} 70% 82%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = `hsl(${hue} 45% 22% / 0.12)`;
  ctx.font = "bold 420px Georgia, serif";
  ctx.fillText("“", 60, 420);

  ctx.fillStyle = `hsl(${hue} 40% 16%)`;
  let fontSize = 64;
  let lines: string[] = [];
  do {
    ctx.font = `italic ${fontSize}px Georgia, 'Times New Roman', serif`;
    lines = wrap(ctx, q.text, size - 200);
    if (lines.length * fontSize * 1.35 < 620) break;
    fontSize -= 4;
  } while (fontSize > 32);
  const lh = fontSize * 1.35;
  let y = size / 2 - (lines.length * lh) / 2 + fontSize * 0.4;
  for (const l of lines) {
    ctx.fillText(l, 100, y);
    y += lh;
  }
  ctx.font = "600 38px system-ui, sans-serif";
  ctx.fillText(`— ${q.author}`, 100, y + 50);
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillStyle = `hsl(${hue} 40% 16% / 0.6)`;
  ctx.fillText("🌱 Kaizen · get 1% better every day", 100, size - 80);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `kaizen-quote-${q.author.toLowerCase().replace(/[^a-z]+/g, "-")}.png`;
  a.click();
}

export function QuoteCard({ featured, style, ...q }: QuoteCardProps) {
  const favorites = favoritesStore.use();
  const hydrated = useHydrated();
  const [speaking, setSpeaking] = useState(false);
  const meta = isCategory(q.category) ? CATEGORY_MAP[q.category] : undefined;
  const hue = meta?.hue ?? 200;
  const isFav = hydrated && favorites.some((f) => f.text === q.text);
  const plain = `“${q.text}” — ${q.author}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      toast("Copied to clipboard", "📋");
    } catch {
      toast("Couldn't copy — try selecting the text", "⚠️");
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: plain, title: "A quote from Kaizen" });
      } catch {
        /* user cancelled */
      }
    } else copy();
  };
  const speak = () => {
    if (!("speechSynthesis" in window)) return toast("Speech isn't supported in this browser", "🔇");
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(`${q.text} … ${q.author}`);
    u.rate = 0.92;
    u.onend = u.onerror = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const actionBtn =
    "grid h-8 w-8 place-items-center rounded-full text-sm text-ink-2 transition hover:bg-surface-2 hover:text-ink";

  return (
    <figure
      style={{ ...style, ["--card-hue" as string]: hue }}
      className={`card group relative flex flex-col overflow-hidden p-6 animate-rise ${featured ? "sm:p-8" : ""}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100"
        style={{ background: `hsl(${hue} 80% 70% / 0.35)` }}
      />
      {meta && (
        <span className="mb-3 inline-flex w-fit items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted">
          <span aria-hidden>{meta.emoji}</span> {meta.label}
        </span>
      )}
      <blockquote className={`quote-text relative flex-1 text-ink ${featured ? "text-2xl leading-snug sm:text-3xl" : "text-lg leading-relaxed"}`}>
        “{q.text}”
      </blockquote>
      <figcaption className="mt-4 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-2">— {q.author}</span>
        <span className="flex items-center gap-0.5">
          <button type="button" className={actionBtn} onClick={speak} aria-label={speaking ? "Stop reading" : "Read aloud"} title="Read aloud">
            {speaking ? "⏹" : "🔈"}
          </button>
          <button type="button" className={actionBtn} onClick={share} aria-label="Share quote" title="Share">↗</button>
          <button type="button" className={actionBtn} onClick={() => downloadImage(q, hue)} aria-label="Download as image" title="Download image">⤓</button>
          <button
            type="button"
            className={`${actionBtn} ${isFav ? "text-rose-500" : ""}`}
            onClick={() => {
              toggleFavorite(q);
              toast(isFav ? "Removed from saved" : "Saved to favourites", isFav ? "🤍" : "❤️");
            }}
            aria-pressed={isFav}
            aria-label={isFav ? "Remove from favourites" : "Save to favourites"}
            title="Save"
          >
            {isFav ? "♥" : "♡"}
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
