// src/lib/rateLimit.ts
// Best-effort, in-memory sliding-window limiter. It protects the AI endpoints
// from runaway scripts and surprise provider bills. On serverless it is per
// instance; for strict global limits use a shared store (e.g. Redis/Upstash).

type Bucket = number[];
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  // Occasionally drop idle buckets so memory stays bounded.
  if (now - lastSweep > 60_000) {
    for (const [k, hits] of buckets) if (!hits.length || now - hits[hits.length - 1] > windowMs) buckets.delete(k);
    lastSweep = now;
  }
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length, retryAfter: 0 };
}

export function clientKey(request: Request) {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || request.headers.get("x-real-ip") || "anonymous";
}

export function _resetRateLimits() {
  buckets.clear();
}
