// src/app/quotes/[category]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuoteExplorer } from "@/components/quotes/QuoteExplorer";
import { getAllQuotes } from "@/lib/quotes.server";
import { CATEGORIES, CATEGORY_MAP, isCategory } from "@/data/quotes";

export const revalidate = 3600;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const meta = isCategory(params.category) ? CATEGORY_MAP[params.category] : null;
  return meta ? { title: `${meta.label} quotes`, description: meta.description } : {};
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  if (!isCategory(params.category)) notFound();
  const quotes = await getAllQuotes();
  return <QuoteExplorer quotes={quotes} initialCategory={params.category} />;
}
