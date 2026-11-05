import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-20 text-center">
      <p className="text-6xl" aria-hidden>🍂</p>
      <h1 className="text-2xl font-semibold">This page has wandered off</h1>
      <p className="text-ink-2">Even the best gardens have a few empty plots.</p>
      <Link href="/" className="btn btn-primary">Back home</Link>
    </div>
  );
}
