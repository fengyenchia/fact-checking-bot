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

function harness({ reportLookup = reportedUrls.findReportedDomain, ai = false, explanationError = false } = {}) {
  const queries = [];
  const explanations = [];
  const verification = loadTs("lib/server/verification.ts", {
    "node:url": { domainToUnicode }, tldts,
    "@/components/chatbot/types": widgetTypes,
    "@/data/scenarios/ticket": scenario,
    "@/lib/widget-url": widgetUrl,
    "./database": { getDatabase: () => ai ? (() => []) : null },
    "./dialogue-assessment": {},
    "./case-selection": caseSelection,
    "./quick-chat": {},
    "./official-hosts": {
      findOfficialHost: (host) => { queries.push("official"); return officialHosts.findOfficialHost(host); },
      findReferencedService: (...args) => { queries.push("brand"); return officialHosts.findReferencedService(...args); },
    },
    "./openai": {
      hasOpenAi: () => ai,
      generateExplanation: async (input, instructions) => {
        explanations.push({ input: JSON.parse(input), instructions });
        if (explanationError) throw new Error("Simulated AI failure");
        return "請先暫停操作，透過可信的官方入口核對。";
      },
    },
    "./reported-urls": { findReportedDomain: (url) => { queries.push("twnic"); return reportLookup(url); } },
    "./retrieval": { findCases: () => { throw new Error("URL checking must not retrieve cases"); } },
  });
  return {
    queries, explanations,
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
    assert.equal(widgetTypes.urlResultLabel(response.results.url), "有通報紀錄");
    assert.match(response.results.url.summary, /此主網域 reported-shop\.invalid 有通報紀錄/);
    assert.match(response.results.url.summary, /其中一筆通報日期為 2026-10-08/);
    assert.match(response.results.url.summary, /不代表目前完整網址曾被通報/);
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
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "安全");
  assert.equal(response.results.url.sourceName, "iOPEN Mall");
});

for (const url of ["http://mall.iopenmall.tw/", "https://mall.iopenmall.tw:8443/", "https://unlisted.iopenmall.tw/"]) {
  test(`a known main domain alone does not satisfy the exact HTTPS service-host check: ${url}`, async () => {
    const response = await harness().submit(url);
    assert.equal(widgetTypes.urlResultLabel(response.results.url), "無法確認");
  });
}

test("a mismatched main domain containing a known brand clue returns 有問題喔", async () => {
  const response = await harness().submit("https://myship.payment-check.invalid/");
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "有問題喔");
  assert.equal(response.results.url.urlEvidence, "brand");
});

test("an unlisted App website stays unknown, with AI only providing an explanation", async () => {
  const app = harness({ ai: true });
  const response = await app.submit("https://www.ilovepdf.com/zh-tw");
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "無法確認");
  assert.equal(response.results.url.sourceUrl, undefined);
  assert.equal(app.explanations[0].input.results.url.label, "無法確認");
  assert.match(app.explanations[0].instructions, /沒有網頁搜尋或網站檢測工具/);
  assert.equal(response.reportUrl, null);
});

test("AI explanation failure preserves the completed URL verdict", async () => {
  const response = await harness({ ai: true, explanationError: true }).submit("https://myship.payment-check.invalid/");
  assert.equal(response.results.url.status, "completed");
  assert.equal(widgetTypes.urlResultLabel(response.results.url), "有問題喔");
  assert.equal(response.aiStatus, "unavailable");
});

const guidance = loadTs("components/chatbot/chatbot-turn.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "@tabler/icons-react": { IconAlertCircle: () => null, IconArrowUpRight: () => null },
  "@/components/case-card": { CaseCarousel: () => null },
});
const { UrlCheckResult } = loadTs("components/chatbot/url-check-result.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "@tabler/icons-react": { IconArrowUpRight: () => null },
  "./chatbot-turn": guidance, "./types": widgetTypes,
});

for (const [url, label, showReport] of [
  ["https://new.reported-shop.invalid/", "有通報紀錄", true],
  ["https://mall.iopenmall.tw/", "安全", false],
  ["https://myship.payment-check.invalid/", "有問題喔", true],
  ["https://unlisted.invalid/", "無法確認", false],
]) {
  test(`URL result displays ${label} and its correct report action`, async () => {
    const response = await harness().submit(url);
    const html = renderToStaticMarkup(createElement(UrlCheckResult, { turn: { response } }));
    assert.ok(html.includes(`>${label}</h2>`));
    assert.equal(html.includes("前往數發部通報"), showReport);
    assert.equal(html.includes("已查詢"), false);
  });
}
