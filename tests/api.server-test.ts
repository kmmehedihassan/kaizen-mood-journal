import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as chat } from "@/app/api/chat/route";
import { POST as reflect } from "@/app/api/reflect/route";

let ip = 0;
const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://test/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const sessionId = "test-session-0001";

test("chat rejects bad input", async () => {
  assert.equal((await chat(req("not json"))).status, 400);
  assert.equal((await chat(req({ sessionId, message: "" }))).status, 400);
  assert.equal((await chat(req({ sessionId: "x", message: "hi" }))).status, 400);
});

test("chat greets first-time visitors", async () => {
  const data = await (await chat(req({ sessionId, message: "hello" }))).json();
  assert.match(data.assistantMsg, /Kaizen/);
});

test("chat routes explicit quote requests", async () => {
  const data = await (await chat(req({ sessionId, message: "tell me a joke" }))).json();
  assert.equal(data.route, "/quotes/funny");
});

test("chat responds to feelings with help, without an AI provider", async () => {
  const data = await (await chat(req({ sessionId, message: "I'm so anxious today" }))).json();
  assert.equal(data.mood, "anxious");
  assert.ok(data.suggestions.some((s: { href: string }) => s.href === "/breathe"));
});

test("chat does not mistake general questions for feelings", async () => {
  const data = await (await chat(req({ sessionId, message: "what's a good way to start a morning routine?" }))).json();
  assert.equal(data.mood, undefined);
});

test("chat answers crisis messages with support resources", async () => {
  const data = await (await chat(req({ sessionId, message: "I want to die" }))).json();
  assert.match(data.assistantMsg, /988|crisis/i);
});

test("chat is rate limited per client", async () => {
  const headers = { "x-forwarded-for": "203.0.113.7" };
  let last = 200;
  for (let i = 0; i < 21; i++) last = (await chat(req({ sessionId, message: "tell me a joke" }, headers))).status;
  assert.equal(last, 429);
});

test("reflect validates mood and falls back without AI", async () => {
  assert.equal((await reflect(req({ mood: "nope" }))).status, 400);
  const data = await (await reflect(req({ mood: "tired", intensity: 4, note: "long day" }))).json();
  assert.equal(data.source, "builtin");
  assert.ok(data.reflection.length > 20);
});
