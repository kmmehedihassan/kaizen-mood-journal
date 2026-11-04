// src/components/ChatDrawer.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useRouter } from "next/navigation";
import { currentMoodStore } from "@/lib/journal";
import type { MoodId } from "@/lib/moods";

type Suggestion = { label: string; href: string };
type Msg = { role: "user" | "assistant"; content: string; suggestions?: Suggestion[] };

const STARTERS = ["I'm feeling stressed", "Make me laugh 😂", "I need motivation", "What can you do?"];
const LOCAL_KEY = "kaizen.chat.v1";

export function ChatDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const sessionId = useRef("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Session + history: server history if a DB is configured, else this browser's copy.
  useEffect(() => {
    let id = localStorage.getItem("sessionId");
    if (!id) {
      id = uuid();
      localStorage.setItem("sessionId", id);
    }
    sessionId.current = id;

    let local: Msg[] = [];
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    } catch {}
    setMsgs(local);

    fetch(`/api/messages?sessionId=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((history: Msg[]) => {
        if (Array.isArray(history) && history.length > local.length) setMsgs(history);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(msgs.slice(-60)));
    } catch {}
  }, [msgs]);

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, pending]);

  // ⌘K / Ctrl+K toggles chat, Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || pending) return;
      const history = msgs.map(({ role, content }) => ({ role, content }));
      setMsgs((prev) => [...prev, { role: "user", content }]);
      setInput("");
      setPending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId.current, message: content, history }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          assistantMsg: string;
          route?: string | null;
          suggestions?: Suggestion[];
          mood?: MoodId | null;
        };
        setMsgs((prev) => [...prev, { role: "assistant", content: data.assistantMsg, suggestions: data.suggestions }]);
        if (data.mood) currentMoodStore.set(data.mood);
        if (data.route) setTimeout(() => router.push(data.route!), 900);
      } catch {
        setMsgs((prev) => [
          ...prev,
          { role: "assistant", content: "Hmm, I couldn't reach the server. Check your connection and try again in a moment." },
        ]);
      } finally {
        setPending(false);
      }
    },
    [input, msgs, pending, router]
  );

  const clear = async () => {
    setMsgs([]);
    fetch(`/api/messages?sessionId=${sessionId.current}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="kaizen-chat"
        aria-label={open ? "Close chat" : "Open chat with Kaizen"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-accent-ink text-2xl text-surface-solid shadow-xl transition hover:scale-105 dark:bg-accent"
      >
        <span aria-hidden>{open ? "✕" : "💬"}</span>
      </button>

      {open && (
        <section
          id="kaizen-chat"
          role="dialog"
          aria-label="Chat with Kaizen"
          className="card animate-rise fixed bottom-24 right-3 z-50 flex h-[min(34rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden shadow-2xl sm:right-5"
          style={{ background: "var(--surface-solid)" }}
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-lg" aria-hidden>🌱</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Kaizen</p>
              <p className="text-xs text-muted">{pending ? "thinking…" : "your 1% better companion"}</p>
            </div>
            {msgs.length > 0 && (
              <button type="button" onClick={clear} className="text-xs text-muted hover:text-ink">
                Clear
              </button>
            )}
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {msgs.length === 0 && (
              <div className="animate-rise space-y-3 text-center">
                <p className="pt-6 text-3xl" aria-hidden>👋</p>
                <p className="text-sm text-ink-2">Tell me how you&apos;re feeling, or try one of these:</p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user" ? "rounded-br-md bg-accent-ink text-surface-solid dark:bg-accent dark:text-black" : "rounded-bl-md bg-surface-2 text-ink"
                  }`}
                >
                  {m.content}
                </div>
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestions.map((s) => (
                      <Link key={s.href + s.label} href={s.href} className="chip hover:border-accent" onClick={() => setOpen(false)}>
                        {s.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <div className="flex gap-1 rounded-2xl bg-surface-2 px-3.5 py-3 w-fit" aria-label="Kaizen is typing">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
          </div>

          {msgs.length < 2 && !pending && (
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip shrink-0 hover:border-accent" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-end gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              className="input max-h-28 resize-none py-2 text-sm"
              placeholder="How are you, really?"
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              aria-label="Message"
            />
            <button type="submit" className="btn btn-primary h-10 px-4" disabled={!input.trim() || pending} aria-label="Send">
              ↑
            </button>
          </form>
        </section>
      )}
    </>
  );
}
