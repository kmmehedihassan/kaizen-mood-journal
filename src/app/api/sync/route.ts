// src/app/api/sync/route.ts
// Stores opaque, client-encrypted journal vaults.
//   GET    ?vault=<id>                        → { ciphertext, revision, updatedAt } | 404
//   PUT    { vault, ciphertext, baseRevision } → { revision } | 409 { revision } on conflict
//   DELETE ?vault=<id>                        → erase the vault from the server
// Optimistic concurrency: a write must name the revision it was based on, so two
// devices saving at once can't silently overwrite each other.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, hasDb } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rateLimit";

const VAULT_RE = /^[0-9a-f]{64}$/;
const MAX_CIPHERTEXT = 4 * 1024 * 1024; // ~3 MB of journal JSON
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function guard(request: Request) {
  if (!hasDb) {
    return NextResponse.json({ error: "Sync isn't configured on this server (no database)." }, { status: 503 });
  }
  const limit = rateLimit(`sync:${clientKey(request)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many sync requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }
  return null;
}

const unavailable = (e: unknown) => {
  console.error("[sync]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: "Sync storage is unavailable right now." }, { status: 503 });
};

export async function GET(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  const vault = request.nextUrl.searchParams.get("vault") ?? "";
  if (!VAULT_RE.test(vault)) return NextResponse.json({ error: "Invalid vault" }, { status: 400 });
  try {
    const row = await db.syncVault.findUnique({ where: { id: vault } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ciphertext: row.ciphertext, revision: row.revision, updatedAt: row.updatedAt });
  } catch (e) {
    return unavailable(e);
  }
}

export async function PUT(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  let body: { vault?: unknown; ciphertext?: unknown; baseRevision?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { vault, ciphertext, baseRevision } = body;
  if (typeof vault !== "string" || !VAULT_RE.test(vault)) return NextResponse.json({ error: "Invalid vault" }, { status: 400 });
  if (typeof ciphertext !== "string" || !ciphertext || ciphertext.length > MAX_CIPHERTEXT || !B64_RE.test(ciphertext)) {
    return NextResponse.json({ error: "Invalid or oversized data" }, { status: 413 });
  }
  if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 0) {
    return NextResponse.json({ error: "Invalid baseRevision" }, { status: 400 });
  }

  try {
    if (baseRevision === 0) {
      const existing = await db.syncVault.findUnique({ where: { id: vault }, select: { revision: true } });
      if (existing) return NextResponse.json({ error: "Conflict", revision: existing.revision }, { status: 409 });
      const row = await db.syncVault.create({ data: { id: vault, ciphertext } });
      return NextResponse.json({ revision: row.revision });
    }
    const updated = await db.syncVault.updateMany({
      where: { id: vault, revision: baseRevision },
      data: { ciphertext, revision: { increment: 1 } },
    });
    if (updated.count === 0) {
      const current = await db.syncVault.findUnique({ where: { id: vault }, select: { revision: true } });
      return NextResponse.json({ error: "Conflict", revision: current?.revision ?? 0 }, { status: 409 });
    }
    return NextResponse.json({ revision: baseRevision + 1 });
  } catch (e) {
    // Unique violation from a racing create → treat as a conflict.
    if ((e as { code?: string })?.code === "P2002") return NextResponse.json({ error: "Conflict", revision: 1 }, { status: 409 });
    return unavailable(e);
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  const vault = request.nextUrl.searchParams.get("vault") ?? "";
  if (!VAULT_RE.test(vault)) return NextResponse.json({ error: "Invalid vault" }, { status: 400 });
  try {
    await db.syncVault.deleteMany({ where: { id: vault } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return unavailable(e);
  }
}
