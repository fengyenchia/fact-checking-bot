import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { domainToUnicode } from "node:url";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as tldts from "tldts";
import { loadTs } from "./helpers/load-server-module.mjs";

const widgetTypes = loadTs("components/chatbot/types.ts");
const accountCopy = loadTs("lib/account-check-copy.ts");
const caseSelection = loadTs("lib/server/case-selection.ts");
const scenario = loadTs("data/scenarios/ticket.ts");
const widgetUrl = loadTs("lib/widget-url.ts", { tldts });
const officialHosts = loadTs("lib/server/official-hosts.ts");
const reportFixture = {
  "網域名稱": "reported-shop.invalid", "偽冒網址": "https://pay.reported-shop.invalid/old?order=1#pay", "接獲通報日期": "20261008",
};
const reportPath = "@/data/通報TWNIC詐騙網址彙整表_20261008.json";

function reportModule(records) {
  return loadTs("lib/server/reported-urls.ts", {
    tldts, "@/lib/widget-url": widgetUrl, [reportPath]: { default: records },
  });
}
const reportedUrls = reportModule([reportFixture]);

function harness({ reportLookup = reportedUrls.findReportedDomain, ai = false, database = true, analysisError = false, analysisOutput = { highlights: [], summary: "目前資料不足以確認此連結的來源。" } } = {}) {
  const queries = [];
  const explanations = [];
  const analyses = [];
  const urlAnalysis = loadTs("lib/server/url-analysis.ts", {
    "@/components/chatbot/types": widgetTypes,
    "./openai": { generateStructuredOutput: async (input, instructions, name, schema) => {
      analyses.push({ input: JSON.parse(input), instructions, name, schema });
      if (analysisError) throw new Error("Simulated AI failure");
      return analysisOutput;
    } },
  });
  const verification = loadTs("lib/server/verification.ts", {
    "node:url": { domainToUnicode }, tldts,
    "@/components/chatbot/types": widgetTypes,
    "@/data/scenarios/ticket": scenario,
    "@/lib/widget-url": widgetUrl,
    "@/lib/account-check-copy": accountCopy,
    "@/lib/quick-chat-actions": {},
    "./database": { getDatabase: () => ai && database ? (() => []) : null },
    "./dialogue-assessment": {},
    "./case-selection": caseSelection,
    "./quick-chat": {},
    "./url-analysis": urlAnalysis,
    "./official-hosts": {
      findOfficialHost: (host) => { queries.push("official"); return officialHosts.findOfficialHost(host); },
      findReferencedService: (...args) => { queries.push("brand"); return officialHosts.findReferencedService(...args); },
    },
    "./openai": {
      hasOpenAi: () => ai,
      generateExplanation: async (input, instructions) => {
        explanations.push({ input: JSON.parse(input), instructions });
        return "請先暫停操作，透過可信的官方入口核對。";
      },
    },
    "./reported-urls": { findReportedDomain: (url) => { queries.push("twnic"); return reportLookup(url); } },
    "./retrieval": { findCases: () => { throw new Error("URL checking must not retrieve cases"); } },
  });
  return {
    queries, explanations, analyses,
    submit: (url) => verification.processSubmission(verification.validateSubmission({
      url, messageIds: [], scriptVersion: scenario.scenarioVersion, sessionId: "url-test-session-0001", submissionId: "url-test-submission-0001",
    })),
  };
}

for (const value of ["123", "im so hungry", "https://127.0.0.1/", "ftp://shop.invalid/", "https://user:pass@shop.invalid/"]) {
  test(`invalid input is rejected before lookup or AI: ${value}`, async () => {
    assert.equal(widgetUrl.parseWidgetUrl(value), null);
    const app = harness({ ai: true });
    const response = await app.submit(value);
    assert.equal(response.results.url.status, "failed");
    assert.equal(app.queries.length, 0);
    assert.equal(app.explanations.length, 0);
    assert.equal(app.analyses.length, 0);
  });
}

for (const url of [
  "https://reported-shop.invalid/",
  "https://new.reported-shop.invalid/new-path?different=2#other",
  "http://CHECKOUT.REPORTED-SHOP.INVALID:8080/another",
  "https://reported-shop.invalid./",
]) {
  test(`TWNIC matches the main domain regardless of subdomain, path or protocol: ${url}`, async () => {
    const response = await harness().submit(url);
    assert.equal(response.results.url.urlEvidence, "twnic");
    assert.equal(widgetTypes.urlResultLabel(response.results.url), "曾被通報");
    assert.match(response.results.url.summary, /這個連結的主網域曾被通報過/);
    assert.equal(response.results.url.highlights[0], "可能涉及網購詐騙");
  });
}

for (const url of [
  "https://reported-shop.invalid.evil.invalid/",
  "https://not-reported-shop.invalid/",
  "https://another.invalid/?next=https://reported-shop.invalid/",
]) {
  test(`TWNIC does not match a domain substring or query: ${url}`, () => {
    assert.equal(reportedUrls.findReportedDomain(new URL(url)), undefined);
  });
}

test("TWNIC uses the domain field and falls back to a parseable reported URL", () => {
  const lookup = reportModule([
    { ...reportFixture, "偽冒網址": "123" },
    { ...reportFixture, "網域名稱": "", "偽冒網址": "https://pay.fallback-shop.invalid/order" },
  ]);
  assert.ok(lookup.findReportedDomain(new URL("https://new.reported-shop.invalid/")));
  assert.ok(lookup.findReportedDomain(new URL("https://fallback-shop.invalid/other")));
});

test("TWNIC domain parsing follows the same private suffix rules as displayed domains", () => {
  const lookup = reportModule([{ ...reportFixture, "網域名稱": "reported-tenant.github.io" }]);
  assert.ok(lookup.findReportedDomain(new URL("https://sub.reported-tenant.github.io/")));
  assert.equal(lookup.findReportedDomain(new URL("https://different-tenant.github.io/")), undefined);
});

test("the real local snapshot also matches a different subdomain and path", () => {
  const records = JSON.parse(readFileSync(new URL("../data/通報TWNIC詐騙網址彙整表_20261008.json", import.meta.url), "utf8"));
  const entry = records.find((item) => widgetUrl.parseWidgetUrl(item["網域名稱"]));
  const domain = tldts.getDomain(widgetUrl.parseWidgetUrl(entry["網域名稱"]).hostname, { allowPrivateDomains: true });
  assert.ok(reportModule(records).findReportedDomain(new URL(`https://new.${domain}/different-path?test=1`)));
});

test("TWNIC wins even when the same main domain also belongs to a known service", async () => {
  const app = harness({ reportLookup: () => reportFixture });
  const response = await app.submit("https://mall.iopenmall.tw/");
  assert.equal(response.results.url.urlEvidence, "twnic");
  assert.equal(app.queries.join(","), "twnic");
});

test("an exact HTTPS service host returns safe with its actual service name", async () => {
  const response = await harness().submit("mall.iopenmall.tw");
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "暫無疑慮");
  assert.equal(response.results.url.sourceName, "iOPEN Mall");
});

for (const url of ["http://mall.iopenmall.tw/", "https://mall.iopenmall.tw:8443/", "https://unlisted.iopenmall.tw/"]) {
  test(`a known main domain alone does not satisfy the exact HTTPS service-host check: ${url}`, async () => {
    const response = await harness().submit(url);
    assert.equal(widgetTypes.urlResultLabel(response.results.url), "無法確定");
  });
}

test("a mismatched main domain containing a known brand clue returns 存在疑慮", async () => {
  const response = await harness().submit("https://myship.payment-check.invalid/");
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "存在疑慮");
  assert.equal(response.results.url.urlEvidence, "brand");
});

test("an unlisted App website stays unknown, with AI only providing an explanation", async () => {
  const app = harness({ ai: true });
  const response = await app.submit("https://www.ilovepdf.com/zh-tw");
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "無法確定");
  assert.equal(response.results.url.sourceUrl, undefined);
  assert.equal(app.explanations.length, 0);
  assert.equal(app.analyses[0].input.domain, "ilovepdf.com");
  assert.match(app.analyses[0].instructions, /沒有網頁搜尋/);
  assert.equal(response.results.url.urlAnalysisStatus, "completed");
});

test("AI analysis failure preserves the completed unknown URL verdict and fallback copy", async () => {
  const response = await harness({ ai: true, analysisError: true }).submit("https://unlisted.invalid/");
  assert.equal(response.results.url.status, "completed");
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "無法確定");
  assert.equal(response.results.url.highlights[0], "來源仍待確認");
  assert.match(response.results.url.summary, /尚無法確認來源/);
  assert.equal(response.aiStatus, "unavailable");
});

const resultLayout = loadTs("components/chatbot/check-result-layout.tsx", {
  "react/jsx-runtime": jsxRuntime, "./types": widgetTypes,
});
const { UrlCheckResult } = loadTs("components/chatbot/url-check-result.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "./check-result-layout": resultLayout,
  "./types": widgetTypes,
});

for (const [url, label, showReport] of [
  ["https://new.reported-shop.invalid/", "曾被通報", true],
  ["https://mall.iopenmall.tw/", "暫無疑慮", false],
  ["https://myship.payment-check.invalid/", "存在疑慮", true],
  ["https://unlisted.invalid/", "無法確定", false],
]) {
  test(`URL result displays ${label} and its correct report action`, async () => {
    const response = await harness().submit(url);
    response.cases = [{ title: "不應出現的案例" }];
    const html = renderToStaticMarkup(createElement(UrlCheckResult, { turn: { response }, onCheck: () => {} }));
    assert.ok(html.includes(`>${label}</h2>`));
    assert.equal(html.includes("已查詢"), false);
    assert.equal(html.includes("不應出現的案例"), false);
    assert.equal(html.includes("查看其他案例"), false);
    assert.equal(html.includes("完整主機"), false);
    assert.equal(html.includes("星之助已查核完畢"), true);
    assert.equal(html.includes("帳號查證"), label === "無法確定");
    assert.equal(html.includes("對話評估"), label === "無法確定");
    assert.equal(html.includes("快速對話"), label === "無法確定");
    assert.equal(html.includes(">前往通報<"), showReport || label === "無法確定");
    assert.equal(html.includes(widgetTypes.digiatReportUrl), showReport || label === "無法確定");
  });
}

test("fixed branches use no AI call and no extra explanation", async () => {
  for (const url of ["https://reported-shop.invalid/", "https://mall.iopenmall.tw/", "https://myship.payment-check.invalid/"]) {
    const app = harness({ ai: true, analysisError: true });
    const response = await app.submit(url);
    assert.equal(app.analyses.length, 0);
    assert.equal(app.explanations.length, 0);
    assert.equal(response.explanation, null);
    assert.equal(response.aiStatus, "local");
  }
});

test("the matched brand and official service name come from the submitted URL", async () => {
  const shopee = await harness().submit("https://shopee.example.com/pay");
  const momo = await harness().submit("https://momo.example.com/pay");
  assert.match(shopee.results.url.summary, /蝦皮購物/);
  assert.match(momo.results.url.summary, /momo 購物網/);
  assert.doesNotMatch(momo.results.url.summary, /蝦皮/);
  const official = await harness().submit("https://mall.iopenmall.tw/");
  assert.match(official.results.url.summary, /iOPEN Mall，可以點開連結/);
  assert.doesNotMatch(official.results.url.summary, /放心|資料庫|已知服務清單/);
});

test("unknown results show a neutral yellow summary and shorten legacy explanations", async () => {
  const response = await harness({ ai: true }).submit("https://unlisted.invalid/");
  assert.equal(response.results.url.highlights[0], "來源仍待確認");
  response.results.url.highlights = [];
  response.results.url.summary = "這是先前保存的很長的說明文字。".repeat(4);
  const html = renderToStaticMarkup(createElement(UrlCheckResult, { turn: { response }, onCheck: () => {} }));
  assert.ok(html.includes("來源仍待確認"));
  assert.ok(html.includes(widgetTypes.unknownUrlFallback.summary));
  assert.equal(html.includes("先前保存"), false);
  assert.ok(html.includes("line-clamp-2"));
});

test("unknown URL analysis only needs an API key, independently of Neon", async () => {
  const response = await harness({ ai: true, database: false }).submit("https://unlisted.invalid/");
  assert.equal(response.results.url.urlAnalysisStatus, "completed");
  assert.equal(response.aiStatus, "completed");
});

test("unknown analysis accepts more than three supported highlights and cannot override verdict", async () => {
  const app = harness({ ai: true, analysisOutput: { highlights: ["線索一需核對", "線索二需核對", "線索三需核對", "線索四需核對"], summary: "字".repeat(28), verdict: "official" } });
  const response = await app.submit("https://unlisted.invalid/");
  assert.equal(response.results.url.highlights.length, 4);
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "無法確定");
  assert.equal(app.analyses[0].schema.properties.highlights.maxItems, undefined);
  assert.equal(app.analyses[0].schema.properties.summary.maxLength, 28);
  assert.equal(Array.from(response.results.url.summary).length, 28);
});

for (const output of [
  { highlights: ["字".repeat(16)], summary: "請核對來源。" },
  { highlights: ["第一行\n第二行"], summary: "請核對來源。" },
  { highlights: [], summary: "字".repeat(29) },
  { highlights: "不是陣列", summary: "請核對來源。" },
  null,
]) {
  test(`invalid structured analysis falls back without failing the URL check: ${JSON.stringify(output).slice(0, 45)}`, async () => {
    const response = await harness({ ai: true, analysisOutput: output }).submit("https://unlisted.invalid/");
    assert.equal(response.results.url.status, "completed");
    assert.equal(response.results.url.urlAnalysisStatus, "unavailable");
    assert.equal(response.results.url.highlights[0], "來源仍待確認");
  });
}
