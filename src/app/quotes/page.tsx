// src/app/quotes/page.tsx
import type { Metadata } from "next";
import { QuoteExplorer } from "@/components/quotes/QuoteExplorer";
import { getAllQuotes } from "@/lib/quotes.server";

export const metadata: Metadata = { title: "Quotes" };
export const revalidate = 3600;

export default async function QuotesPage() {
  const quotes = await getAllQuotes();
  return <QuoteExplorer quotes={quotes} initialCategory="all" />;
}
