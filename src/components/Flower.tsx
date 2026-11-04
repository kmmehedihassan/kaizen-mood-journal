// src/components/Flower.tsx
// A generative flower: petals = mood, colour = mood hue, size = intensity.
import type { Mood } from "@/lib/moods";

export function Flower({
  mood,
  intensity = 3,
  size = 64,
  sway = true,
  delay = 0,
}: {
  mood: Mood;
  intensity?: number;
  size?: number;
  sway?: boolean;
  delay?: number;
}) {
  const scale = 0.6 + intensity * 0.1; // 0.7 … 1.1
  const bloomR = 15 * scale;
  const petalLen = bloomR;
  const cx = 32;
  const cy = 24;
  const petals = Array.from({ length: mood.petals }, (_, i) => (360 / mood.petals) * i);
  // Unpleasant moods droop slightly — the garden shows the weather of your days.
  const droop = mood.valence < 0 ? 8 : 0;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={`${mood.label} flower, intensity ${intensity}`}
      className="overflow-visible"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <g
        className={sway ? "animate-sway" : undefined}
        style={{ transformOrigin: "32px 64px", animationDelay: `${delay}s` }}
      >
        <path
          d={`M32 64 C 30 52, 34 ${42 + droop / 2}, ${cx} ${cy + droop}`}
          stroke={`hsl(${120 + mood.valence * 6} 40% 38%)`}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="27" cy="50" rx="5" ry="2.2" transform="rotate(-30 27 50)" fill={`hsl(125 40% 45%)`} />
        <g transform={`translate(${cx} ${cy + droop}) rotate(${droop * 2})`}>
          {petals.map((deg, i) => (
            <ellipse
              key={deg}
              cx="0"
              cy={-petalLen * 0.55}
              rx={Math.max(2.4, (petalLen * 2.6) / mood.petals)}
              ry={petalLen * 0.6}
              transform={`rotate(${deg})`}
              fill={`hsl(${mood.hue} 80% ${i % 2 ? 66 : 60}%)`}
              stroke={`hsl(${mood.hue} 60% 45% / 0.35)`}
              strokeWidth="0.6"
            />
          ))}
          <circle r={bloomR * 0.32} fill={`hsl(${(mood.hue + 40) % 360} 85% 55%)`} />
          <circle r={bloomR * 0.14} cx={-bloomR * 0.08} cy={-bloomR * 0.08} fill="hsl(0 0% 100% / 0.6)" />
        </g>
      </g>
    </svg>
  );
}

export function Sprout({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden style={{ maxWidth: "100%", height: "auto" }}>
      <path d="M32 64 L32 52" stroke="hsl(125 30% 45% / 0.6)" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="28" cy="51" rx="4" ry="2" transform="rotate(-30 28 51)" fill="hsl(125 35% 50% / 0.5)" />
      <ellipse cx="36" cy="50" rx="4" ry="2" transform="rotate(30 36 50)" fill="hsl(125 35% 50% / 0.5)" />
    </svg>
  );
}
