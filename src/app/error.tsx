"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-20 text-center">
      <p className="text-6xl" aria-hidden>🌧️</p>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-ink-2">A small storm passed through. Your journal is safe in your browser.</p>
      <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
    </div>
  );
}
