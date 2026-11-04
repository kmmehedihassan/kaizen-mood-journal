// src/lib/llm.ts
import "server-only";

// One small interface over the providers this project has used. The first one
// configured wins; if none is configured (or all fail) callers get `null` and
// fall back to Kaizen's built-in, rule-based responses.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface Provider {
  name: string;
  enabled: () => boolean;
  url: () => string;
  key: () => string | undefined;
  model: () => string;
}

const PROVIDERS: Provider[] = [
  {
    name: "huggingface",
    enabled: () => Boolean(process.env.HF_API_KEY),
    url: () => "https://router.huggingface.co/v1/chat/completions",
    key: () => process.env.HF_API_KEY,
    model: () => process.env.HF_MODEL || "deepseek-ai/DeepSeek-V3-0324:together",
  },
  {
    name: "openai",
    enabled: () => Boolean(process.env.OPENAI_API_KEY),
    url: () => `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
    key: () => process.env.OPENAI_API_KEY,
    model: () => process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  {
    name: "ollama",
    enabled: () => Boolean(process.env.OLLAMA_HOST),
    url: () => `${process.env.OLLAMA_HOST}/v1/chat/completions`,
    key: () => undefined,
    model: () => process.env.OLLAMA_MODEL || "llama3.2",
  },
];

export function aiAvailable() {
  return PROVIDERS.some((p) => p.enabled());
}

export async function complete(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string | null> {
  for (const p of PROVIDERS.filter((x) => x.enabled())) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
    try {
      const key = p.key();
      const res = await fetch(p.url(), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({
          model: p.model(),
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 300,
          stream: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      // Reasoning models sometimes emit <think>…</think>; never show that to users.
      const clean = content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
      if (clean) return clean;
    } catch (e) {
      console.error(`[llm:${p.name}]`, e instanceof Error ? e.message : e);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
