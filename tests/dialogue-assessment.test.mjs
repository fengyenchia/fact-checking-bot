import assert from "node:assert/strict";
import { test } from "node:test";
import { domainToUnicode } from "node:url";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-server-module.mjs";

const scenario = loadTs("data/scenarios/ticket.ts");
const widgetTypes = loadTs("components/chatbot/types.ts");
const caseSelection = loadTs("lib/server/case-selection.ts");
const caseFixture = {
  card: { id: "buyer-case", title: "假買家索驗證碼", summary: "假買家以開通賣場收款為由索取簡訊驗證碼。", sourceName: "165", sourceUrl: "https://165dashboard.tw/city-case-summary" },
  summary: "假買家聲稱賣場收款功能未開通，冒充平台協助解除限制，要求提供簡訊驗證碼。",
};
const shoppingText = "你的賣場收款功能未開通，把簡訊驗證碼傳來，我幫你解除限制。";

function assessment(riskLevel = "high", text = shoppingText, caseIds = [], reason = "以開通賣場收款為由索取驗證碼。") {
  return {
    riskLevel,
    summary: riskLevel === "insufficient" ? "請補選相關訊息，線索不足不代表安全。" : "先停止操作並透過可信管道核對。",
    evidence: riskLevel === "insufficient" ? [] : [{ messageIndex: 0, quote: text, reason }],
    caseIds,
  };
}

function harness({ output = assessment(), key = true, database = true, relatedCases = [], retrievalError = false, apiError = false, incomplete = false, refusal = false } = {}) {
  const requests = [];
  const searches = [];
  const openai = loadTs("lib/server/openai.ts", {}, {
    process: { env: key ? { OPENAI_API_KEY: "fake-test-key", OPENAI_MODEL: "test-model" } : {} },
    fetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      if (apiError) throw new Error("Simulated API failure");
      return {
        ok: true,
        json: async () => ({
          status: incomplete ? "incomplete" : "completed",
          output: [{ type: "message", content: refusal
            ? [{ type: "refusal", refusal: "Simulated refusal" }]
            : [{ type: "output_text", text: JSON.stringify(output) }] }],
        }),
      };
    },
  });
  const dialogue = loadTs("lib/server/dialogue-assessment.ts", { "./openai": openai, "./case-selection": caseSelection });
  const verification = loadTs("lib/server/verification.ts", {
    "node:url": { domainToUnicode },
    tldts: {},
    "@/components/chatbot/types": widgetTypes,
    "@/data/scenarios/ticket": scenario,
    "@/lib/widget-url": {},
    "./database": { getDatabase: () => database ? (() => []) : null },
    "./dialogue-assessment": dialogue,
    "./case-selection": caseSelection,
    "./quick-chat": {},
    "./official-hosts": {},
    "./openai": openai,
    "./reported-urls": {},
    "./retrieval": {
      findCases: async (...args) => {
        searches.push(args);
        if (retrievalError) throw new Error("Simulated RAG failure");
        return relatedCases;
      },
    },
  });
  return { ...verification, requests, searches };
}

function input(text = shoppingText, id = "unrelated-message-id") {
  return {
    submissionId: "test-submission-0001", sessionId: "test-session-0001", scriptVersion: scenario.scenarioVersion,
    messageIds: [id], selectedMessages: [{ id, text }],
  };
}

test("assessment uses selected text and RAG, without account, script labels, unselected messages or inherited ticket context", async () => {
  const app = harness({ output: assessment("high", shoppingText, ["buyer-case"]), relatedCases: [caseFixture] });
  const response = await app.processSubmission(input());
  assert.equal(response.results.dialogue.dialogueAssessment.riskLevel, "high");
  assert.equal(response.cases[0].id, "buyer-case");
  assert.equal(app.searches[0][0], shoppingText);
  assert.equal(app.searches[0][1], null);
  assert.equal(app.requests.length, 1, "do not generate an extra generic explanation");
  const request = app.requests[0].body;
  const data = JSON.parse(request.input);
  assert.deepEqual(data.selectedMessages, [{ messageIndex: 0, text: shoppingText }]);
  assert.equal(data.relatedCases[0].original, caseFixture.summary);
  assert.equal(request.input.includes(scenario.ticketSellerId), false);
  assert.equal(request.input.includes("unrelated-message-id"), false);
  assert.equal(request.input.includes("轉帳失敗"), false);
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.store, false);
});

test("changing message IDs does not change the content assessment", async () => {
  const app = harness();
  const first = await app.processSubmission(input(shoppingText, "follow-up-1"));
  const second = await app.processSubmission(input(shoppingText, "opening-1"));
  assert.equal(JSON.stringify(first.results.dialogue), JSON.stringify(second.results.dialogue));
});

test("a greeting can produce insufficient evidence instead of a preassigned high risk", async () => {
  const app = harness({ output: assessment("insufficient") });
  const response = await app.processSubmission(input("你好，想詢問哪個商品？", "follow-up-3"));
  assert.equal(response.results.dialogue.verdict, "unknown");
  assert.equal(response.results.dialogue.dialogueAssessment.riskLevel, "insufficient");
  assert.equal(response.reportUrl, null);
});

test("a non-payment shopping scam mechanism can produce potential risk without a keyword mapping", async () => {
  const text = "這台相機只賣市價一成，不提供實拍照片，請別向原賣場詢問。";
  const app = harness({ output: assessment("potential", text, [], "超低價且拒絕提供商品實拍或賣場查證。") });
  const response = await app.processSubmission(input(text));
  assert.equal(response.results.dialogue.verdict, "caution");
  assert.equal(response.results.dialogue.dialogueAssessment.riskLevel, "potential");
  assert.ok(response.reportUrl);
});

for (const [name, options, expectedRetrieval] of [
  ["no matching cases", {}, "completed"],
  ["RAG failure", { retrievalError: true }, "unavailable"],
  ["no database", { database: false }, "unavailable"],
]) {
  test(`${name} still permits content assessment without inventing cases`, async () => {
    const app = harness(options);
    const response = await app.processSubmission(input());
    assert.equal(response.results.dialogue.status, "completed");
    assert.equal(response.results.dialogue.dialogueAssessment.retrievalStatus, expectedRetrieval);
    assert.equal(response.cases.length, 0);
  });
}

for (const [name, change] of [
  ["fabricated quote", (value) => { value.evidence[0].quote = "不存在的原文"; }],
  ["wrong message reference", (value) => { value.evidence[0].messageIndex = 1; }],
  ["unsupported case ID", (value) => { value.caseIds = ["fabricated-case"]; }],
  ["risk without evidence", (value) => { value.evidence = []; }],
  ["invalid risk level", (value) => { value.riskLevel = "safe"; }],
  ["insufficient with risk evidence", (value) => { value.riskLevel = "insufficient"; }],
]) {
  test(`${name} is rejected without returning a risk conclusion`, async () => {
    const output = assessment();
    change(output);
    const response = await harness({ output }).processSubmission(input());
    assert.equal(response.results.dialogue.status, "failed");
    assert.equal(response.results.dialogue.verdict, undefined);
    assert.equal(response.reportUrl, null);
    assert.equal(response.aiStatus, "unavailable");
  });
}

for (const [name, options] of [
  ["no API key", { key: false }],
  ["API failure", { apiError: true }],
  ["incomplete response", { incomplete: true }],
  ["refusal", { refusal: true }],
]) {
  test(`${name} returns a retryable failure, never script or local risk`, async () => {
    const app = harness(options);
    const response = await app.processSubmission(input());
    assert.equal(response.results.dialogue.status, "failed");
    assert.equal(response.results.dialogue.dialogueAssessment, undefined);
    assert.equal(response.reportUrl, null);
    if (options.key === false) assert.equal(app.requests.length, 0);
  });
}

test("server restores original text and rejects forged selection IDs", () => {
  const app = harness();
  const real = scenario.openingMessages.find(({ sender }) => sender === "seller");
  const restored = app.validateSubmission({ ...input("偽造內容", real.id), selectedMessages: [{ id: real.id, text: "偽造內容" }] });
  assert.equal(restored.selectedMessages[0].text, real.text);
  assert.throws(() => app.validateSubmission(input("偽造內容")), /勾選的訊息/);
});

const { DialogueCheckResult } = loadTs("components/chatbot/dialogue-check-result.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "./types": widgetTypes,
  "@/components/case-card": { CaseCarousel: () => null },
});

for (const level of ["high", "potential", "insufficient"]) {
  test(`result view renders the ${level} assessment and corresponding report action`, async () => {
    const response = await harness({ output: assessment(level) }).processSubmission(input());
    const html = renderToStaticMarkup(createElement(DialogueCheckResult, { turn: { response } }));
    assert.ok(html.includes(widgetTypes.dialogueRiskLabels[level]));
    assert.equal(html.includes("前往數發部通報"), level !== "insufficient");
    if (level !== "high") assert.equal(html.includes("極高風險"), false);
  });
}

test("legacy script results request a fresh assessment instead of implying a current AI decision", () => {
  const html = renderToStaticMarkup(createElement(DialogueCheckResult, {
    turn: { response: { results: { dialogue: { status: "completed", verdict: "risk", summary: "舊紀錄" } }, cases: [] } },
  }));
  assert.ok(html.includes("請重新評估"));
  assert.equal(html.includes("極高風險"), false);
});
