// src/app/journal/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { JournalClient } from "@/components/journal/JournalClient";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="card h-96 animate-pulse" />}>
      <JournalClient />
    </Suspense>
  );
}
