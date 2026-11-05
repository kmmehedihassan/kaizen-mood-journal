// Sync API without a database: must degrade gracefully.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

delete process.env.DATABASE_URL;
const vault = (n: number) => n.toString(16).padStart(64, "0");
const req = (method: string, query: string) =>
  new NextRequest(`http://test/api/sync${query}`, { method, headers: { "x-forwarded-for": "10.8.0.1" } });
const loadRoute = async () => import("@/app/api/sync/route");

test("without a database, sync reports 503 instead of failing", async () => {
  const route = await loadRoute();
  const res = await route.GET(req("GET", `?vault=${vault(1)}`));
  assert.equal(res.status, 503);
});

