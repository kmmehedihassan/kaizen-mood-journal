# 🌱 Kaizen — mood journal

A private, AI-assisted mood journal built on the idea of **kaizen** (改善, continuous improvement):
get just 1% better each day. Check in with how you feel, get words that fit and one tiny step,
and watch your days grow into a **Mood Garden**.

**Live:** [https://kaizen-quote-website.vercel.app](https://kaizen-quote-website.vercel.app)

---

## Features

| | |
|---|---|
| **😌 Instant check-in** (home) | Pick one of 9 moods → an empathetic note, three ≤2-minute "1% actions" you can tick off, and a matched quote. |
| **📓 Journal** (`/journal`) | Mood + intensity + note + tags + a gratitude line. Rotating writing prompts. While you type, Kaizen **suggests a mood from your words** (local sentiment detection). Search & filter your timeline. |
| **✨ AI reflections** | One click asks the AI for a short, kind reflection on an entry (with a thoughtful built-in fallback when no AI is configured). |
| **🌷 Mood Garden** (`/garden`) | Each check-in plants a generative SVG flower: petal count and colour come from the mood, size from intensity, and hard days droop a little. Includes a **mood weather** forecast for the week and a six-month **year-in-pixels** view. |
| **📈 Insights** (`/insights`) | Streaks, "Kaizen growth" (1.01ⁿ), a 30-day mood trend with hover tooltips, mood mix, weekly rhythm, **which tags lift or drain you**, and a gratitude wall. Export, import or clear your data. |
| **🫧 Breathe** (`/breathe`) | Guided box, 4-7-8 and coherent breathing with an animated orb, progress ring and haptics on mobile. |
| **💬 Quotes** (`/quotes`) | 55+ curated quotes in 7 collections (motivational, romantic, funny, calm, resilience, gratitude, wisdom). Search, shuffle, "surprise me", save favourites, **read aloud**, share, or **download as an image**. |
| **🤖 Chat companion** | `⌘K` / `Ctrl+K` anywhere. Greets you, routes quote requests, answers feelings with empathy, a tiny step, a quote and quick links, and chats freely through an LLM. Includes a crisis-safety response. |
| **🎨 Living theme** | The app's colour gently shifts to match your latest mood. Light/dark/system theme, mobile-first, keyboard accessible, and respects reduced motion. |

### Privacy by design
Journal entries, favourites and streaks live **only in your browser's localStorage**. Nothing is
sent anywhere unless you press **Reflect** (sends that one entry to the AI provider, not stored) or use chat.

### Works with zero configuration
- **No database?** Quotes come from the built-in library (`src/data/quotes.ts`), and chat history is kept in the browser.
- **No AI key?** Chat and reflections fall back to rule-based responses built from the mood model.
- **Database configured?** Chat sessions are persisted, and any extra quotes in the `Quote` table are merged into the library.

---

## Tech stack
- **Next.js 14** (App Router, route handlers), **React 18**, **TypeScript**
- **Tailwind CSS v4** with theme tokens (OKLCH, mood-hue driven)
- **Prisma + PostgreSQL** (optional)
- **LLM** via any OpenAI-compatible endpoint: Hugging Face router, OpenAI, or Ollama

---

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. That's it. Everything works out of the box.

### Optional environment variables (`.env.local`)

```env
# AI provider: the first one configured is used, and the next is tried if it fails
HF_API_KEY=hf_...
HF_MODEL="deepseek-ai/DeepSeek-V3-0324:together"
OPENAI_API_KEY=sk-...
OPENAI_MODEL="gpt-4o-mini"           # optional; OPENAI_BASE_URL is also supported
OLLAMA_HOST="http://localhost:11434"
OLLAMA_MODEL="llama3.2"

# Database (chat persistence + custom quotes)
DATABASE_URL="postgresql://USER:PASS@HOST:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://USER:PASS@HOST:5432/postgres?sslmode=require"
```

With a database:

```bash
npx prisma db push      # or: npx prisma migrate dev --name init
npm run seed            # optional: copy the built-in quotes into the DB
```

### Scripts
| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Seed quotes into the DB |

---

## API

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chat` | `{ sessionId, message, history? }` → `{ assistantMsg, route?, suggestions?, mood? }` |
| `GET` / `DELETE` | `/api/messages?sessionId=` | Read or clear a chat session (DB only) |
| `GET` | `/api/quotes` | Query: `category`, `q`, `limit`, `random`, `daily` |
| `POST` | `/api/reflect` | `{ mood, intensity, note, tags }` → `{ reflection, source: "ai" \| "builtin" }` |

Legacy URLs `/motivational`, `/romantic` and `/funny` permanently redirect to `/quotes/<category>`.

---

## Project structure

```
src/
  app/
    page.tsx                 # home: check-in, week strip, quote of the day
    journal/ garden/ insights/ breathe/
    quotes/ + quotes/[category]/
    api/ chat/ messages/ quotes/ reflect/
  components/                # NavBar, ChatDrawer, QuoteCard, MoodPicker, Flower, …
  data/quotes.ts             # built-in quote library + categories
  lib/
    moods.ts                 # the 9-mood model (hue, valence, energy, actions…)
    sentiment.ts             # dependency-free emotion detection
    journal.ts, store.ts     # localStorage stores, streaks, import/export
    llm.ts                   # multi-provider chat completions with fallback
    prisma.ts                # optional DB with timeout-safe access
  tools/navigate.ts          # chat "navigate" tool
prisma/ schema.prisma, seed.ts
```

---

> Kaizen is a wellbeing companion, not a substitute for professional care. If you are in crisis,
> contact local emergency services or a crisis line (e.g. call or text 988 in the US; see findahelpline.com).
