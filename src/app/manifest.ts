// src/app/manifest.ts — makes Kaizen installable as an app (PWA manifest)
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kaizen — mood journal",
    short_name: "Kaizen",
    description: "A private mood journal. Check in daily, grow a Mood Garden, get 1% better every day.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#3f8f6b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "New check-in", url: "/journal" },
      { name: "Breathe", url: "/breathe" },
      { name: "Mood Garden", url: "/garden" },
    ],
  };
}
