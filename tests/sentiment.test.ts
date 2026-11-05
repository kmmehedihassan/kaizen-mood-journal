import { test } from "node:test";
import assert from "node:assert/strict";
import { detectMood, detectCategoryRequest } from "@/lib/sentiment";

test("detects clear feelings", () => {
  assert.equal(detectMood("I'm so stressed about my exam").mood, "anxious");
  assert.equal(detectMood("feeling exhausted and drained").mood, "tired");
  assert.equal(detectMood("so thankful for my friends").mood, "grateful");
  assert.equal(detectMood("I am furious with my landlord").mood, "angry");
});

test("handles negation", () => {
  assert.equal(detectMood("I'm not happy today").mood, "sad");
  assert.equal(detectMood("honestly not worried at all").mood, "calm");
});

test("intensifiers raise the score", () => {
  const plain = detectMood("I am sad").scores.sad!;
  const strong = detectMood("I am really sad").scores.sad!;
  assert.ok(strong > plain);
});

test("returns no mood for neutral text", () => {
  const r = detectMood("The meeting is at three o'clock");
  assert.equal(r.mood, null);
  assert.equal(r.confidence, 0);
});

test("recognises explicit quote requests", () => {
  assert.equal(detectCategoryRequest("tell me a joke"), "funny");
  assert.equal(detectCategoryRequest("I need some motivation"), "motivational");
  assert.equal(detectCategoryRequest("something romantic please"), "romantic");
  assert.equal(detectCategoryRequest("how was your day"), null);
});
