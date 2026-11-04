// src/app/api/quotes/route.ts
// GET /api/quotes?category=calm&q=breath&random=1&daily=1&limit=10
import { NextResponse, type NextRequest } from "next/server";
import { getQuotes } from "@/lib/quotes.server";
import { pickBySeed } from "@/lib/moods";
import { dayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const quotes = await getQuotes({ category: p.get("category"), q: p.get("q") });

  if (p.has("daily")) {
    return NextResponse.json(quotes.length ? pickBySeed(quotes, p.get("day") ?? dayKey()) : null);
  }
  if (p.has("random")) {
    return NextResponse.json(quotes.length ? quotes[Math.floor(Math.random() * quotes.length)] : null);
  }
  const limit = Number(p.get("limit"));
  return NextResponse.json(Number.isFinite(limit) && limit > 0 ? quotes.slice(0, limit) : quotes);
}
