// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/** The database is optional: without DATABASE_URL the app runs on built-in data. */
export const hasDb = Boolean(process.env.DATABASE_URL);

export const db: PrismaClient =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}

/**
 * Run a DB operation, but never let a slow/unavailable database break a page.
 * Returns `fallback` if there is no DB, it errors, or it takes too long.
 */
export async function safeDb<T>(op: () => Promise<T>, fallback: T, timeoutMs = 3000): Promise<T> {
  if (!hasDb) return fallback;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      op(),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch (e) {
    console.error("[db]", e instanceof Error ? e.message : e);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
