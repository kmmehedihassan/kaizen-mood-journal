// src/app/garden/page.tsx
import type { Metadata } from "next";
import { GardenClient } from "@/components/garden/GardenClient";

export const metadata: Metadata = { title: "Mood Garden" };

export default function GardenPage() {
  return <GardenClient />;
}
