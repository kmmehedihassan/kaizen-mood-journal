import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, _resetRateLimits } from "@/lib/rateLimit";

test("allows up to the limit, then blocks until the window passes", () => {
  _resetRateLimits();
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit("k", 3, 1000, t + i).ok, true);
  const blocked = rateLimit("k", 3, 1000, t + 10);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1);
  assert.equal(rateLimit("k", 3, 1000, t + 1001).ok, true);
  assert.equal(rateLimit("other", 3, 1000, t + 10).ok, true, "keys are independent");
});
