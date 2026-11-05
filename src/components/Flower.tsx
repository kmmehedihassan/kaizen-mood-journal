// src/components/Flower.tsx
// A generative flower: petals = mood, colour = mood hue, size = intensity.
// Geometry lives in lib/flowerArt so the shareable garden image matches exactly.
import type { Mood } from "@/lib/moods";
import { SPROUT_MARKUP, flowerMarkup } from "@/lib/flowerArt";

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
        dangerouslySetInnerHTML={{ __html: flowerMarkup(mood, intensity) }}
      />
    </svg>
  );
}

export function Sprout({ size = 64 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      style={{ maxWidth: "100%", height: "auto" }}
      dangerouslySetInnerHTML={{ __html: SPROUT_MARKUP }}
    />
  );
}
