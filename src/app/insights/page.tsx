// src/app/insights/page.tsx
import type { Metadata } from "next";
import { InsightsClient } from "@/components/insights/InsightsClient";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return <InsightsClient />;
}
