// Sync API against a real Postgres. Runs when TEST_DATABASE_URL points at a
// throwaway database (CI provides one); skipped otherwise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

const TEST_DB = process.env.TEST_DATABASE_URL;
const vault = (n: number) => n.toString(16).padStart(64, "0");
let ip = 0;
const req = (method: string, query: string, body?: unknown) =>
  new NextRequest(`http://test/api/sync${query}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.0.${++ip % 250}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function loadRoute() {
  process.env.DATABASE_URL = TEST_DB;
  process.env.DIRECT_URL = TEST_DB;
  return import("@/app/api/sync/route");
}

test("sync round-trip with optimistic concurrency", { skip: !TEST_DB && "TEST_DATABASE_URL not set" }, async () => {
  const route = await loadRoute();
  const { db } = await import("@/lib/prisma");
  const id = vault(Date.now());
  const get = () => route.GET(req("GET", `?vault=${id}`));

  assert.equal((await get()).status, 404);
  assert.equal((await route.PUT(req("PUT", "", { vault: "nope", ciphertext: "AAAA", baseRevision: 0 }))).status, 400);
  assert.equal((await route.PUT(req("PUT", "", { vault: id, ciphertext: "not base64!", baseRevision: 0 }))).status, 413);

  const created = await route.PUT(req("PUT", "", { vault: id, ciphertext: "QUFB", baseRevision: 0 }));
  assert.equal(created.status, 200);
  assert.equal((await created.json()).revision, 1);

  // A second "create" or a write based on a stale revision is a conflict.
  assert.equal((await route.PUT(req("PUT", "", { vault: id, ciphertext: "QkJC", baseRevision: 0 }))).status, 409);
  const ok = await route.PUT(req("PUT", "", { vault: id, ciphertext: "QkJC", baseRevision: 1 }));
  assert.equal((await ok.json()).revision, 2);
  const stale = await route.PUT(req("PUT", "", { vault: id, ciphertext: "Q0ND", baseRevision: 1 }));
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).revision, 2);

  const latest = await (await get()).json();
  assert.equal(latest.ciphertext, "QkJC");
  assert.equal(latest.revision, 2);

  const del = await route.DELETE(req("DELETE", `?vault=${id}`));
  assert.equal(del.status, 200);
  assert.equal((await get()).status, 404);
  await db.$disconnect();
});
