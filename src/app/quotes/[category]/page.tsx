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

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const meta = isCategory(category) ? CATEGORY_MAP[category] : null;
  return meta ? { title: `${meta.label} quotes`, description: meta.description } : {};
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const quotes = await getAllQuotes();
  return <QuoteExplorer quotes={quotes} initialCategory={category} />;
}
