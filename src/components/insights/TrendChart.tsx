// src/components/insights/TrendChart.tsx
"use client";

import { useState } from "react";
import { formatDay } from "@/lib/dates";

type Point = { day: string; value: number | null; label?: string };

/** Single-series line of daily mood (-2..+2) with a hover crosshair + tooltip. */
export function TrendChart({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 220;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ((2 - v) / 4) * ih;

  // Break the line where there are gaps.
  const segments: string[] = [];
  let seg = "";
  points.forEach((p, i) => {
    if (p.value === null) {
      if (seg) segments.push(seg);
      seg = "";
      return;
    }
    seg += `${seg ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  if (seg) segments.push(seg);

  const h = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Daily mood over the last 30 days"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / iw) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        {[2, 1, 0, -1, -2].map((v) => (
          <g key={v}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeDasharray={v === 0 ? undefined : "2 4"}
              strokeWidth={v === 0 ? 1.2 : 1}
            />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12">
              {["😢", "🙁", "😐", "🙂", "😄"][v + 2]}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % 7 === (points.length - 1) % 7 ? (
            <text key={p.day} x={x(i)} y={H - 6} textAnchor={i === points.length - 1 ? "end" : i === 0 ? "start" : "middle"} fontSize="11" fill="var(--muted)">
              {formatDay(p.day, { month: "short", day: "numeric" })}
            </text>
          ) : null
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) =>
          p.value !== null ? <circle key={p.day} cx={x(i)} cy={y(p.value)} r="3" fill="var(--accent)" /> : null
        )}
        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--muted)" strokeWidth="1" />
            {h.value !== null && (
              <circle cx={x(hover)} cy={y(h.value)} r="5" fill="var(--accent)" stroke="var(--surface-solid)" strokeWidth="2" />
            )}
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface-solid px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="font-semibold">{formatDay(h.day)}</p>
          <p className="text-ink-2">{h.value === null ? "No check-in" : h.label}</p>
        </div>
      )}
    </div>
  );
}
