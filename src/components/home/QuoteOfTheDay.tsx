// src/components/home/QuoteOfTheDay.tsx
"use client";

import { useEffect, useState } from "react";
import { QuoteCard } from "@/components/QuoteCard";
import { QUOTES, type Quote } from "@/data/quotes";
import { pickBySeed } from "@/lib/moods";
import { dayKey } from "@/lib/dates";

export function QuoteOfTheDay() {
  const [quote, setQuote] = useState<Quote | null>(null);
  // Picked on the client so it follows the visitor's own calendar day.
  useEffect(() => setQuote(pickBySeed(QUOTES, `qotd-${dayKey()}`)), []);

  return (
    <section aria-labelledby="qotd-heading" className="space-y-4">
      <h2 id="qotd-heading" className="text-xl font-semibold tracking-tight">Quote of the day</h2>
      {quote ? <QuoteCard {...quote} featured /> : <div className="card h-48 animate-pulse" />}
    </section>
  );
}
