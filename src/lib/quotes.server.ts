// src/lib/quotes.server.ts
import "server-only";
import { QUOTES, normalizeQuoteText, type Quote } from "@/data/quotes";
import { db, safeDb } from "@/lib/prisma";

/** Built-in library merged with any extra quotes stored in the database. */
export async function getAllQuotes(): Promise<Quote[]> {
  const dbQuotes = await safeDb(
    () => db.quote.findMany({ orderBy: { id: "asc" } }),
    [] as { id: number; text: string; author: string; category: string }[]
  );
  const seen = new Set(QUOTES.map((q) => normalizeQuoteText(q.text)));
  const extra: Quote[] = [];
  for (const q of dbQuotes) {
    const key = normalizeQuoteText(q.text);
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push({ id: `db-${q.id}`, text: q.text, author: q.author, category: q.category.toLowerCase() });
  }
  return [...QUOTES, ...extra];
}

export async function getQuotes(opts: { category?: string | null; q?: string | null } = {}) {
  const all = await getAllQuotes();
  const needle = opts.q?.trim().toLowerCase();
  return all.filter(
    (quote) =>
      (!opts.category || quote.category === opts.category) &&
      (!needle || quote.text.toLowerCase().includes(needle) || quote.author.toLowerCase().includes(needle))
  );
}
