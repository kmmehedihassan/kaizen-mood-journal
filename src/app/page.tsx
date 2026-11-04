// src/app/page.tsx
import Link from "next/link";
import { CheckIn } from "@/components/home/CheckIn";
import { QuoteOfTheDay } from "@/components/home/QuoteOfTheDay";
import { WeekStrip } from "@/components/home/WeekStrip";

const FEATURES = [
  { href: "/journal", emoji: "📓", title: "Daily check-ins", body: "Ten seconds to log a mood. Add a note, tags, and a gratitude line if you like." },
  { href: "/garden", emoji: "🌷", title: "Your Mood Garden", body: "Every check-in plants a flower shaped by how you felt. Watch your days bloom." },
  { href: "/insights", emoji: "📈", title: "Insights that matter", body: "Discover which days, habits and tags actually lift your mood." },
  { href: "/breathe", emoji: "🫧", title: "Guided breathing", body: "Box, 4-7-8 or coherent breathing with a calming visual guide." },
  { href: "/quotes", emoji: "💬", title: "Quotes for every mood", body: "Seven collections. Save, listen, share or download as an image." },
  { href: "#chat", emoji: "🤖", title: "An AI companion", body: "Tell Kaizen how you feel and get a tiny next step. Press ⌘K / Ctrl+K." },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <CheckIn />

      <section aria-labelledby="week-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="week-heading" className="text-xl font-semibold tracking-tight">Your week in bloom</h2>
          <Link href="/garden" className="text-sm font-medium text-accent-ink hover:underline">Open garden →</Link>
        </div>
        <WeekStrip />
      </section>

      <QuoteOfTheDay />

      <section aria-labelledby="features-heading" className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <h2 id="features-heading" className="text-2xl font-semibold tracking-tight">Small steps. Compounding change.</h2>
          <p className="text-ink-2">
            <em>Kaizen</em> (改善) is the Japanese practice of continuous improvement. Get just 1% better each day and in a year
            you&apos;re <strong>37×</strong> further along. This journal makes that practice gentle, visual and private.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <Link href={f.href} className="card group block h-full p-5 transition hover:-translate-y-1 hover:shadow-lg">
                <span className="text-2xl" aria-hidden>{f.emoji}</span>
                <h3 className="mt-3 font-semibold group-hover:text-accent-ink">{f.title}</h3>
                <p className="mt-1 text-sm text-ink-2">{f.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
