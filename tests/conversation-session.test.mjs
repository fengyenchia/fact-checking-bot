import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { loadTs } from "./helpers/load-server-module.mjs";

const { conversationDateKey, restoreConversationSession } = loadTs(
  "lib/conversation-session.ts", {}, { crypto: { randomUUID } },
);
const beforeMidnight = new Date("2026-11-20T15:59:59Z");
const afterMidnight = new Date("2026-11-20T16:00:00Z");

test("Taiwan midnight starts a new test day, before UTC midnight", () => {
  assert.equal(conversationDateKey(beforeMidnight), "2026-11-20");
  assert.equal(conversationDateKey(afterMidnight), "2026-11-21");
});

test("same-day refresh preserves both the session ID and sent progress", () => {
  const saved = { id: randomUUID(), sentAt: beforeMidnight.getTime(), dateKey: "2026-11-20" };
  const restored = restoreConversationSession(JSON.stringify(saved), beforeMidnight);
  assert.equal(JSON.stringify(restored), JSON.stringify(saved));
});

test("next-day entry resets progress and gets a different ID", () => {
  const saved = { id: randomUUID(), sentAt: beforeMidnight.getTime(), dateKey: "2026-11-20" };
  const restored = restoreConversationSession(JSON.stringify(saved), afterMidnight);
  assert.notEqual(restored.id, saved.id);
  assert.equal(restored.sentAt, null);
  assert.equal(restored.dateKey, "2026-11-21");
});

test("refreshing the new day again preserves its new session", () => {
  const initial = restoreConversationSession(null, afterMidnight);
  const restored = restoreConversationSession(JSON.stringify(initial), new Date("2026-11-21T02:00:00Z"));
  assert.equal(restored.id, initial.id);
  assert.equal(restored.sentAt, null);
});

test("legacy sessions without a date start fresh instead of reusing a multi-day ID", () => {
  const id = randomUUID();
  const restored = restoreConversationSession(JSON.stringify({ id, sentAt: beforeMidnight.getTime() }), afterMidnight);
  assert.notEqual(restored.id, id);
  assert.equal(restored.sentAt, null);
});

test("missing or corrupt browser data does not prevent starting a session", () => {
  for (const raw of [null, "{broken", "null", "[]", "123", JSON.stringify({ id: "", sentAt: null, dateKey: "2026-11-21" }), JSON.stringify({ id: randomUUID(), sentAt: "123", dateKey: "2026-11-21" })]) {
    const restored = restoreConversationSession(raw, afterMidnight);
    assert.ok(restored.id);
    assert.equal(restored.sentAt, null);
    assert.equal(restored.dateKey, "2026-11-21");
  }
});
