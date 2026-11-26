import assert from "node:assert/strict";
import { test } from "node:test";
import { domainToUnicode } from "node:url";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-server-module.mjs";

const scenario = loadTs("data/scenarios/ticket.ts");
const widgetTypes = loadTs("components/chatbot/types.ts");
const actionRouting = loadTs("lib/quick-chat-actions.ts", { "@/components/chatbot/types": widgetTypes });
const accountCopy = loadTs("lib/account-check-copy.ts");
const caseSelection = loadTs("lib/server/case-selection.ts");
const candidates = [
  { card: { id: "case-a", title: "門票假客服", summary: "假客服要求提供驗證碼。", sourceName: "165", sourceUrl: "https://165dashboard.tw/city-case-summary" }, summary: "購買門票後，賣家假冒客服要求提供簡訊驗證碼。" },
  { card: { id: "case-b", title: "耳機假退款", summary: "以耳機退款為由要求匯款。", sourceName: "165", sourceUrl: "https://165dashboard.tw/city-case-summary" }, summary: "網購耳機後，對方要求先匯款才退款。" },
  { card: { id: "case-c", title: "門票再匯款", summary: "轉帳失敗後要求再次付款。", sourceName: "165", sourceUrl: "https://165dashboard.tw/city-case-summary" }, summary: "買門票時，對方稱轉帳失敗要求再付款，前款之後會退回。" },
];
const question = "我買演唱會門票，對方說轉帳失敗，要我再付一次，還傳來付款驗證連結。";

function reply(overrides = {}) {
  return {
    segments: [
      { text: "對方以轉帳失敗要求再付款，先別再付或點開驗證連結。", action: "url" },
      { text: "與官方門票案例的重複付款手法相似，可評估這段對話。", action: "dialogue" },
    ],
    caseIds: ["case-c", "case-a"], ...overrides,
  };
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
  const quickChat = loadTs("lib/server/quick-chat.ts", { "./openai": openai, "./case-selection": caseSelection, "@/lib/quick-chat-actions": actionRouting });
  const verification = loadTs("lib/server/verification.ts", {
    "node:url": { domainToUnicode }, tldts: {},
    "@/components/chatbot/types": widgetTypes,
    "@/lib/account-check-copy": accountCopy,
    "@/lib/quick-chat-actions": actionRouting,
    "@/data/scenarios/ticket": scenario,
    "@/lib/widget-url": {},
    "./database": { getDatabase: () => database ? (() => []) : null },
    "./dialogue-assessment": {}, "./case-selection": caseSelection, "./quick-chat": quickChat,
    "./official-hosts": {}, "./reported-urls": {}, "./openai": openai,
    "./url-analysis": {},
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
  assert.equal(response.explanation, reply().segments.map(({ text }) => text).join("\n\n"));
  assert.equal(JSON.stringify(response.chatSegments.map(({ text, action }) => ({ text, action }))), JSON.stringify(reply().segments));
  assert.equal(response.suggestedActions.join(","), "url,dialogue");
  assert.equal(response.cases.map(({ id }) => id).join(","), "case-c,case-a");
  assert.equal(response.results.chat.caseSelection.caseIds.join(","), "case-c,case-a");
  assert.equal(response.results.chat.caseSelection.retrievalStatus, "completed");
  assert.equal("reportUrl" in response, false);
  assert.equal(app.requests.length, 1);
  const request = app.requests[0].body;
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.store, false);
  const data = JSON.parse(request.input);
  assert.equal(data.submittedText, question);
  assert.equal(data.relatedCases.length, 3);
  assert.equal(data.relatedCases[0].original, candidates[0].summary);
  assert.equal(request.text.format.schema.properties.segments.items.properties.text.maxLength, 48);
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
  const app = harness({ output: reply({ segments: [{ text: "耳機退款前卻要求先匯款，先停止付款並向原平台確認。", action: null }], caseIds: ["case-b"] }) });
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
  const response = await harness({ output: reply({ segments: [{ text: "本工具協助網購詐騙查證，可以描述你的交易情況。", action: null }], caseIds: [] }) }).submit("今天會下雨嗎？");
  assert.equal(response.cases.length, 0);
  assert.equal(response.suggestedActions.length, 0);
});

for (const [name, change] of [
  ["fabricated case ID", (value) => { value.caseIds = ["not-in-retrieval"]; }],
  ["non-array case selection", (value) => { value.caseIds = "case-a"; }],
  ["too many selected cases", (value) => { value.caseIds = ["case-a", "case-b", "case-c", "case-a"]; }],
  ["unknown action", (value) => { value.segments[0].action = "open-unknown-link"; }],
  ["external report action", (value) => { value.segments[0].action = "report"; }],
  ["non-array segments", (value) => { value.segments = "report"; }],
  ["empty segments", (value) => { value.segments = []; }],
  ["too many segments", (value) => { value.segments = Array.from({ length: 4 }, () => ({ text: "請查證來源。", action: null })); }],
  ["missing action", (value) => { delete value.segments[0].action; }],
  ["empty paragraph", (value) => { value.segments[0].text = " "; }],
  ["oversized paragraph", (value) => { value.segments[0].text = "字".repeat(48) + "。"; }],
  ["multiline paragraph", (value) => { value.segments[0].text = "第一點\n第二點"; }],
  ["unfinished sentence", (value) => { value.segments[0].text = "可透過平台官方管道檢舉對"; }],
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
    assert.equal(response.explanation, "可描述對方要求你做什麼，以及使用的交易平台。");
    assert.ok(response.suggestedActions.every((action) => widgetTypes.quickChatTools.includes(action)));
  });
}

test("both card pipelines share duplicate removal and preserve the AI order", () => {
  const cards = caseSelection.selectedCaseCards(candidates, ["case-c", "case-c", "case-a"]);
  assert.equal(cards.map(({ id }) => id).join(","), "case-c,case-a");
});

test("48-character complete paragraphs are accepted and link actions attach to the matching text", async () => {
  const response = await harness({ output: reply({ segments: [{ text: "字".repeat(47) + "。", action: "url" }, { text: "再核對連結。", action: "url" }] }) }).submit();
  assert.equal(response.results.chat.status, "completed");
  assert.equal(response.suggestedActions.join(","), "url");
  assert.equal(response.chatSegments[0].action, null);
  assert.equal(response.chatSegments[1].action, "url");
});

const { QuickChatReply } = loadTs("components/chatbot/quick-chat-reply.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "./types": widgetTypes,
  "@/lib/quick-chat-actions": actionRouting,
});

test("each paragraph is immediately followed by its own action, without repeating the joined answer", async () => {
  const response = await harness().submit();
  const html = renderToStaticMarkup(createElement(QuickChatReply, { response, onCheck: () => {} }));
  const firstText = html.indexOf(response.chatSegments[0].text);
  const firstButton = html.indexOf("前往連結查證");
  const secondText = html.indexOf(response.chatSegments[1].text);
  const secondButton = html.indexOf("前往對話評估");
  assert.ok(firstText >= 0 && firstText < firstButton && firstButton < secondText && secondText < secondButton);
  assert.equal(html.split(response.chatSegments[0].text).length - 1, 1);
  assert.equal(html.includes(widgetTypes.digiatReportUrl), false);
});

test("stored replies without segments remain readable", () => {
  const response = { results: {}, explanation: "先前保存的回覆。", suggestedActions: ["account", "report"], cases: [] };
  const html = renderToStaticMarkup(createElement(QuickChatReply, { response, onCheck: () => {} }));
  assert.ok(html.includes("先前保存的回覆。"));
  assert.ok(html.includes("前往帳號查證"));
  assert.equal(html.includes(widgetTypes.digiatReportUrl), false);
});

test("a failed reply displays one error instead of repeating AI and request errors", async () => {
  const response = await harness({ apiError: true }).submit();
  const html = renderToStaticMarkup(createElement(QuickChatReply, { response, onCheck: () => {} }));
  assert.equal((html.match(/role="alert"/g) ?? []).length, 1);
  assert.ok(html.includes("小客服暫時無法回覆，請稍後重試。"));
  assert.equal(html.includes("AI 說明暫時無法產生"), false);
});

test("case cards stay below every paragraph and action", async () => {
  const { QuickChatHistory } = loadTs("components/chatbot/quick-chat.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "next/image": { default: ({ src, alt, width, height, className }) => createElement("img", { src, alt, width, height, className }) },
    "motion/react": { useReducedMotion: () => true, motion: { div: ({ children, className }) => createElement("div", { className }, children) } },
    "@/components/case-card": { CaseCarousel: ({ cases }) => createElement("div", null, cases.map(({ title }) => title).join("、")) },
    "./quick-chat-reply": { QuickChatReply },
  });
  const response = await harness().submit();
  const html = renderToStaticMarkup(createElement(QuickChatHistory, {
    turns: [{ submissionId: "test", input: { text: question }, response }], pending: false, transcriptRef: null, onCheck: () => {},
  }));
  assert.ok(html.indexOf("前往對話評估") < html.indexOf("門票再匯款"));
});

for (const [text, expected] of [
  ["先別點付款連結，請核對網址來源。", "url"],
  ["先查對方帳號是否有相關通報紀錄。", "account"],
  ["可評估這段對話，辨識要求再付款的話術。", "dialogue"],
  ["先查這個連結與對方帳號，確認來源。", "url,account"],
]) {
  test(`mentioned tools are present even when AI omits the action: ${expected}`, async () => {
    const response = await harness({ output: reply({ segments: [{ text, action: null }] }) }).submit(text);
    assert.equal(response.suggestedActions.join(","), expected);
    assert.equal(response.chatSegments[0].actions.join(","), expected);
    const html = renderToStaticMarkup(createElement(QuickChatReply, { response, onCheck: () => {} }));
    for (const tool of expected.split(",")) assert.ok(html.includes(`前往${widgetTypes.checkLabels[tool]}`));
  });
}

test("bank account wording cannot create a social account lookup button", async () => {
  const response = await harness({ output: reply({ segments: [{ text: "銀行帳號凍結不能由賣家解除，先停止操作。", action: "account" }] }) }).submit();
  assert.equal(response.suggestedActions.includes("account"), false);
});

test("a mismatched AI action moves to the paragraph that actually mentions its tool", async () => {
  const response = await harness({ output: reply({ segments: [
    { text: "先查對方帳號是否有通報紀錄。", action: "url" },
    { text: "先別點這個付款連結，請核對來源。", action: null },
  ] }) }).submit("請幫我查對方帳號與付款連結。");
  assert.equal(response.chatSegments[0].actions.join(","), "account");
  assert.equal(response.chatSegments[1].actions.join(","), "url");
});

test("pressure to unfreeze an account does not get a social lookup button just because AI chose one", async () => {
  const text = "他以交易問題施壓要求解凍，與案例手法相似；可透過臉書官方管道查。";
  const response = await harness({ output: reply({ segments: [{ text, action: "account" }] }) }).submit("他說逾時就要負責，要求我處理解凍。");
  assert.equal(response.suggestedActions.join(","), "dialogue");
  const html = renderToStaticMarkup(createElement(QuickChatReply, { response, onCheck: () => {} }));
  assert.equal(html.includes("前往帳號查證"), false);
  assert.ok(html.includes("前往對話評估"));
  // The same correction applies to a previously saved mistaken button.
  response.chatSegments[0].actions = ["account", "dialogue"];
  const savedHtml = renderToStaticMarkup(createElement(QuickChatReply, { response, onCheck: () => {} }));
  assert.equal(savedHtml.includes("前往帳號查證"), false);
});

test("AI cannot introduce account lookup when the submitted conversation has no social account topic", async () => {
  const response = await harness({ output: reply({ segments: [{ text: "可查對方社群帳號是否有通報紀錄。", action: "account" }] }) }).submit("他要求我再付款一次，否則要付逾時費。");
  assert.equal(response.suggestedActions.includes("account"), false);
});
