import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-server-module.mjs";

const widgetTypes = loadTs("components/chatbot/types.ts");
const scenario = loadTs("data/scenarios/ticket.ts");
const accountCopy = loadTs("lib/account-check-copy.ts");
const layout = loadTs("components/chatbot/check-result-layout.tsx", {
  "react/jsx-runtime": jsxRuntime, "./types": widgetTypes,
});
const { AccountCheckResult } = loadTs("components/chatbot/account-check-result.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "@/lib/account-check-copy": accountCopy,
  "./check-result-layout": layout,
});

function harness({ records = [], database = true, databaseError = false } = {}) {
  const queries = [];
  const sql = async (strings, ...values) => {
    queries.push({ query: strings.join("?"), values });
    if (databaseError) throw new Error("Simulated Neon failure");
    return records.filter(({ id }) => id === values[0]);
  };
  const unexpectedAi = () => { throw new Error("Account checking must not call AI"); };
  const verification = loadTs("lib/server/verification.ts", {
    "node:url": {}, tldts: {}, "@/lib/widget-url": {},
    "@/components/chatbot/types": widgetTypes,
    "@/data/scenarios/ticket": scenario,
    "@/lib/account-check-copy": accountCopy,
    "@/lib/quick-chat-actions": {},
    "./database": { getDatabase: () => database ? sql : null },
    "./openai": { hasOpenAi: () => true, generateExplanation: unexpectedAi, generateStructuredOutput: unexpectedAi },
    "./case-selection": {}, "./dialogue-assessment": {}, "./official-hosts": {},
    "./quick-chat": {}, "./reported-urls": {}, "./retrieval": { findCases: unexpectedAi }, "./url-analysis": {},
  });
  return {
    queries,
    submit: (accountId) => verification.processSubmission(verification.validateSubmission({
      accountId, messageIds: [], scriptVersion: scenario.scenarioVersion,
      sessionId: "account-test-session", submissionId: "account-test-submission",
    })),
  };
}

const entry = { id: "giveme_money", lookup_count: 45, case_status: "核實中", source_url: "https://example.com/source" };
const htmlFor = (response) => renderToStaticMarkup(createElement(AccountCheckResult, { turn: { response }, onCheck: () => {} }));

test("normalizes the account ID and reads its existing count without incrementing it", async () => {
  const app = harness({ records: [entry] });
  const response = await app.submit("@GIVEME_MONEY");
  assert.equal(app.queries[0].values[0], "giveme_money");
  assert.equal(response.results.account.accountDetails.lookupCount, 45);
  assert.ok(app.queries.every(({ query }) => /^SELECT\s/.test(query)));
  assert.equal(response.aiStatus, "local");
  assert.equal(response.explanation, null);
  assert.equal(response.cases.length, 0);
});

for (const caseStatus of ["核實中", "正在核實", "高風險", null]) {
  test(`every listed account uses the same fixed reported result: ${caseStatus}`, async () => {
    const response = await harness({ records: [{ ...entry, case_status: caseStatus }] }).submit(entry.id);
    const html = htmlFor(response);
    assert.ok(html.includes(">曾被通報</h2>"));
    assert.ok(html.includes("該帳號可能涉及網購詐騙活動"));
    assert.ok(html.includes("45 人"));
    assert.ok(html.includes("前往數發部通報"));
    assert.equal(html.includes("高風險"), false);
    assert.equal(html.includes("潛在風險"), false);
    assert.equal(html.includes("來源"), false);
    assert.equal(html.includes("核實中"), false);
    assert.equal(html.includes("對話評估"), false);
  });
}

test("unknown accounts display zero, a fixed explanation and four actions", async () => {
  const response = await harness().submit("someone_else");
  const html = htmlFor(response);
  assert.equal(response.results.account.verdict, "unknown");
  for (const text of [">無法確定</h2>", "0 人", "該帳號暫無相關通報紀錄", "帳號查證", "對話評估", "快速對話", "前往通報"]) assert.ok(html.includes(text));
  assert.equal(html.includes("前往數發部通報"), false);
  assert.equal(response.explanation, null);
});

test("changing the count only changes the displayed number", async () => {
  const first = await harness({ records: [entry] }).submit(entry.id);
  const second = await harness({ records: [{ ...entry, lookup_count: 1234 }] }).submit(entry.id);
  assert.equal(htmlFor(first).replace("45 人", "1,234 人"), htmlFor(second));
});

test("legacy or unfilled counts use zero without affecting the report result", async () => {
  const response = await harness({ records: [{ ...entry, lookup_count: null }] }).submit(entry.id);
  assert.ok(htmlFor(response).includes("0 人"));
  assert.ok(htmlFor(response).includes(">曾被通報</h2>"));
});

test("database failure remains a retryable failure instead of an unknown verdict", async () => {
  const response = await harness({ databaseError: true }).submit(entry.id);
  assert.equal(response.results.account.status, "failed");
  assert.equal(response.results.account.verdict, undefined);
});

test("invalid account IDs are rejected without querying Neon", async () => {
  const app = harness();
  const response = await app.submit("not an account!");
  assert.equal(response.results.account.status, "failed");
  assert.equal(app.queries.length, 0);
});

test("the no-database preview uses fixed content and no fabricated count", async () => {
  const response = await harness({ database: false }).submit(scenario.ticketSellerId);
  assert.equal(response.results.account.verdict, "risk");
  assert.ok(htmlFor(response).includes("0 人"));
});

test("neither result displays case cards or old generated explanations", async () => {
  for (const records of [[], [entry]]) {
    const response = await harness({ records }).submit(entry.id);
    response.cases = [{ title: "不該顯示的案例" }];
    response.explanation = "不該顯示的 AI 文字";
    const html = htmlFor(response);
    assert.equal(html.includes("不該顯示"), false);
    assert.equal(html.includes("查看其他案例"), false);
  }
});
