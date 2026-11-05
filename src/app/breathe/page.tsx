// src/app/breathe/page.tsx
import type { Metadata } from "next";
import { Breather } from "@/components/Breather";

export const metadata: Metadata = { title: "Breathe" };

export default function BreathePage() {
  return <Breather />;
}
