// tests/setup.ts — a tiny browser-ish environment for the localStorage stores.
const mem = new Map<string, string>();
const target = new EventTarget();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  },
  addEventListener: target.addEventListener.bind(target),
  removeEventListener: target.removeEventListener.bind(target),
  dispatchEvent: target.dispatchEvent.bind(target),
};
delete process.env.DATABASE_URL;
for (const k of ["HF_API_KEY", "OPENAI_API_KEY", "OLLAMA_HOST"]) delete process.env[k];
export function resetStorage() {
  mem.clear();
}
