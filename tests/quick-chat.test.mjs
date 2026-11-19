import assert from "node:assert/strict";
import { test } from "node:test";
import { domainToUnicode } from "node:url";
import { loadTs } from "./helpers/load-server-module.mjs";

const scenario = loadTs("data/scenarios/ticket.ts");
const widgetTypes = loadTs("components/chatbot/types.ts");
const caseSelection = loadTs("lib/server/case-selection.ts");
const candidates = [
  { card: { id: "case-a", title: "門票假客服", summary: "假客服要求提供驗證碼。", sourceName: "165", sourceUrl: "https://165dashboard.tw/city-case-summary" }, summary: "購買門票後，賣家假冒客服要求提供簡訊驗證碼。" },
  { card: { id: "case-b", title: "耳機假退款", summary: "以耳機退款為由要求匯款。", sourceName: "165", sourceUrl: "https://165dashboard.tw/city-case-summary" }, summary: "網購耳機後，對方要求先匯款才退款。" },
  { card: { id: "case-c", title: "門票再匯款", summary: "轉帳失敗後要求再次付款。", sourceName: "165", sourceUrl: "https://165dashboard.tw/city-case-summary" }, summary: "買門票時，對方稱轉帳失敗要求再付款，前款之後會退回。" },
];
const question = "我買演唱會門票，對方說轉帳失敗，要我再付一次。";

function reply(overrides = {}) {
  return { answer: "先暫停付款，從銀行 App 核對交易並保留對話。", suggestedActions: ["url", "report"], caseIds: ["case-c", "case-a"], ...overrides };
}

function harness({ output = reply(), key = true, database = true, relatedCases = candidates, retrievalError = false, apiError = false } = {}) {
  const requests = [];
  const searches = [];
  const openai = loadTs("lib/server/openai.ts", {}, {
    process: { env: key ? { OPENAI_API_KEY: "fake-test-key", OPENAI_MODEL: "test-model" } : {} },
    fetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      if (apiError) throw new Error("Simulated API failure");
      return { ok: true, json: async () => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }] }) };
    },
  });
  const quickChat = loadTs("lib/server/quick-chat.ts", { "./openai": openai, "./case-selection": caseSelection });
  const verification = loadTs("lib/server/verification.ts", {
    "node:url": { domainToUnicode }, tldts: {},
    "@/components/chatbot/types": widgetTypes,
    "@/data/scenarios/ticket": scenario,
    "@/lib/widget-url": {},
    "./database": { getDatabase: () => database ? (() => []) : null },
    "./dialogue-assessment": {}, "./case-selection": caseSelection, "./quick-chat": quickChat,
    "./official-hosts": {}, "./reported-urls": {}, "./openai": openai,
    "./retrieval": {
      findCases: async (...args) => {
        searches.push(args);
        if (retrievalError) throw new Error("Simulated RAG failure");
        return relatedCases;
      },
    },
  });
  return {
    requests, searches,
    submit: (text = question, priorTurns = []) => verification.processSubmission(verification.validateSubmission({
      text, scriptVersion: scenario.scenarioVersion, sessionId: "quick-test-session-001", submissionId: "quick-test-submission-001",
    }), priorTurns),
  };
}

test("quick chat returns only AI-selected cases in AI order, with reply and actions generated in one call", async () => {
  const app = harness();
  const response = await app.submit();
  assert.equal(response.results.chat.status, "completed");
  assert.equal(response.explanation, reply().answer);
  assert.equal(response.suggestedActions.join(","), "url,report");
  assert.equal(response.cases.map(({ id }) => id).join(","), "case-c,case-a");
  assert.equal(response.results.chat.caseSelection.caseIds.join(","), "case-c,case-a");
  assert.equal(response.results.chat.caseSelection.retrievalStatus, "completed");
  assert.equal(app.requests.length, 1);
  const request = app.requests[0].body;
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.store, false);
  const data = JSON.parse(request.input);
  assert.equal(data.submittedText, question);
  assert.equal(data.relatedCases.length, 3);
  assert.equal(data.relatedCases[0].original, candidates[0].summary);
});

test("quick chat can select fewer than three or no candidates without displaying the raw RAG list", async () => {
  for (const ids of [["case-c"], []]) {
    const response = await harness({ output: reply({ caseIds: ids }) }).submit();
    assert.equal(response.cases.map(({ id }) => id).join(","), ids.join(","));
    assert.equal(response.results.chat.status, "completed");
  }
});

test("a change of product uses the current question for product hints and lets AI drop prior ticket cases", async () => {
  const text = "現在想問我買的耳機，對方要求先匯款才退款。";
  const prior = [{ question: "我買演唱會門票，還沒拿到票。", answer: "先向賣家核對交票方式。" }];
  const app = harness({ output: reply({ caseIds: ["case-b"] }) });
  const response = await app.submit(text, prior);
  assert.equal(app.searches[0][0], `${text}\n${prior[0].question}`);
  assert.equal(app.searches[0][1], null);
  assert.equal(JSON.parse(app.requests[0].body.input).priorConversation[0].answer, prior[0].answer);
  assert.equal(response.cases[0].id, "case-b");
});

for (const [name, settings, status] of [
  ["no RAG match", { relatedCases: [] }, "completed"],
  ["RAG failure", { retrievalError: true }, "unavailable"],
]) {
  test(`${name} permits a reply without invented cases`, async () => {
    const app = harness({ ...settings, output: reply({ caseIds: [] }) });
    const response = await app.submit();
    assert.equal(response.results.chat.status, "completed");
    assert.equal(response.results.chat.caseSelection.retrievalStatus, status);
    assert.equal(response.cases.length, 0);
    assert.equal(app.requests.length, 1);
    assert.equal(JSON.parse(app.requests[0].body.input).relatedCases.length, 0);
  });
}

test("an out-of-scope model reply can omit every RAG candidate and action", async () => {
  const response = await harness({ output: reply({ answer: "本工具協助網購詐騙查證，可以描述你的交易情況。", suggestedActions: [], caseIds: [] }) }).submit("今天會下雨嗎？");
  assert.equal(response.cases.length, 0);
  assert.equal(response.suggestedActions.length, 0);
});

for (const [name, change] of [
  ["fabricated case ID", (value) => { value.caseIds = ["not-in-retrieval"]; }],
  ["non-array case selection", (value) => { value.caseIds = "case-a"; }],
  ["too many selected cases", (value) => { value.caseIds = ["case-a", "case-b", "case-c", "case-a"]; }],
  ["unknown action", (value) => { value.suggestedActions = ["open-unknown-link"]; }],
  ["non-array actions", (value) => { value.suggestedActions = "report"; }],
  ["empty answer", (value) => { value.answer = " "; }],
  ["oversized answer", (value) => { value.answer = "字".repeat(601); }],
]) {
  test(`${name} rejects the response without leaking unfiltered candidate cards`, async () => {
    const output = reply();
    change(output);
    const response = await harness({ output }).submit();
    assert.equal(response.results.chat.status, "failed");
    assert.equal(response.cases.length, 0);
    assert.equal(response.explanation, null);
    assert.equal(response.aiStatus, "unavailable");
  });
}

test("model API failure does not expose the candidate cards", async () => {
  const response = await harness({ apiError: true }).submit();
  assert.equal(response.results.chat.status, "failed");
  assert.equal(response.cases.length, 0);
});

for (const [name, settings] of [["no API key", { key: false }], ["no database", { database: false }]]) {
  test(`${name} keeps preview advice but does not bypass AI card selection with fixed cards`, async () => {
    const app = harness(settings);
    const response = await app.submit();
    assert.equal(response.results.chat.status, "completed");
    assert.equal(response.aiStatus, "local");
    assert.equal(response.cases.length, 0);
    assert.equal(app.requests.length, 0);
    assert.equal(app.searches.length, 0);
  });
}

test("both card pipelines share duplicate removal and preserve the AI order", () => {
  const cards = caseSelection.selectedCaseCards(candidates, ["case-c", "case-c", "case-a"]);
  assert.equal(cards.map(({ id }) => id).join(","), "case-c,case-a");
});
