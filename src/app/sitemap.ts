// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/data/quotes";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/journal", "/garden", "/insights", "/breathe", "/quotes"];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly" as const, priority: p ? 0.7 : 1 })),
    ...CATEGORIES.map((c) => ({ url: `${SITE_URL}/quotes/${c.id}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
