// src/components/Toaster.tsx
"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; emoji?: string };
const EVENT = "kaizen-toast";

export function toast(message: string, emoji?: string) {
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENT, { detail: { message, emoji } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let n = 0;
    const onToast = (e: Event) => {
      const { message, emoji } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const id = ++n;
      setToasts((t) => [...t.slice(-2), { id, message, emoji }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className="card animate-rise flex items-center gap-2 px-4 py-2.5 text-sm font-medium shadow-lg">
          {t.emoji && <span aria-hidden>{t.emoji}</span>}
          {t.message}
        </div>
      ))}
    </div>
  );
}
