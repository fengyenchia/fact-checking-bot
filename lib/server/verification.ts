import "server-only"

import { domainToUnicode } from "node:url"
import { parse } from "tldts"
import { unknownUrlFallback, urlResultLabel, type WidgetResponse, type CheckResult as Result } from "@/components/chatbot/types"
import { followUpMessages, openingMessages, scenarioVersion, ticketSellerId } from "@/data/scenarios/ticket"
import { parseWidgetUrl } from "@/lib/widget-url"
import { accountCheckCopy } from "@/lib/account-check-copy"
import { quickChatDisplaySegments } from "@/lib/quick-chat-actions"
import { getDatabase } from "./database"
import { selectedCaseCards, type RelatedCase, type RetrievalStatus } from "./case-selection"
import { assessDialogue } from "./dialogue-assessment"
import { findOfficialHost, findReferencedService } from "./official-hosts"
import { hasOpenAi } from "./openai"
import { replyToChat } from "./quick-chat"
import { findReportedDomain } from "./reported-urls"
import { findCases } from "./retrieval"
import { analyzeUnknownUrl } from "./url-analysis"

const sellerMessages = [...openingMessages, ...followUpMessages].filter(({ sender }) => sender === "seller")

export type { WidgetResponse } from "@/components/chatbot/types"

export function validateSubmission(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("查證資料格式不符")
  const data = raw as Record<string, unknown>
  const submissionId = data.submissionId
  const sessionId = data.sessionId
  if (!validId(submissionId) || !validId(sessionId)) throw new Error("測試場次或提交編號不符")
  if (data.scriptVersion !== scenarioVersion) throw new Error("劇本已更新，請重整頁面後再查證")

  const text = optionalText(data.text, 1_000)
  const url = optionalText(data.url, 1_000)
  const accountId = optionalText(data.accountId, 100)
  const ids = data.messageIds ?? []
  if (!Array.isArray(ids) || ids.length > sellerMessages.length
    || !ids.every((id) => sellerMessages.some((message) => message.id === id))) {
    throw new Error("勾選的訊息與劇本不符")
  }
  const selectedMessages = sellerMessages.filter((message) => ids.includes(message.id))
    .map(({ id, text }) => ({ id, text }))
  const messageIds = selectedMessages.map(({ id }) => id)
  if (!text && !url && !accountId && !messageIds.length) throw new Error("請至少填寫一項查證內容")

  return { submissionId, sessionId, scriptVersion: scenarioVersion, text, url, accountId, messageIds, selectedMessages }
}

type Submission = ReturnType<typeof validateSubmission>
export type PriorChatTurn = { question: string; answer: string | null }

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{12,80}$/.test(value)
}

function optionalText(value: unknown, maxLength: number) {
  if (value == null) return undefined
  if (typeof value !== "string" || value.length > maxLength) throw new Error("輸入格式不符或內容過長")
  return value.trim() || undefined
}

async function checkUrl(raw: string): Promise<Result> {
  const parsedUrl = parseWidgetUrl(raw)
  if (!parsedUrl) {
    return { status: "failed", summary: "請輸入有效的 HTTP 或 HTTPS 網址。" }
  }

  const host = parsedUrl.hostname.toLowerCase().replace(/\.$/, "")
  const { domain, domainWithoutSuffix, subdomain } = parse(host, { allowPrivateDomains: true })
  const address = { host, domain, subdomain }
  const report = findReportedDomain(parsedUrl)
  if (report) {
    return {
      ...address,
      status: "completed",
      verdict: "risk",
      highlights: ["可能涉及網購詐騙"],
      summary: "這個連結的主網域曾被通報過，可能涉及網購詐騙！\n建議馬上停止交易，並且千萬不要點開連結！",
      urlEvidence: "twnic",
      sourceName: "通報 TWNIC 詐騙網址彙整表",
    }
  }

  const matched = findOfficialHost(host)
  if (matched && !parsedUrl.port && parsedUrl.protocol === "https:") {
    const summary = host === "s.shopee.tw"
      ? `此網址經比對為 ${matched.name}的短連結服務。目前僅核對短網址來源，轉址後的網站仍需查證。`
      : `此網址經比對為 ${matched.name}，可以點開連結！\n不過請注意！\n若對方又有傳送可疑連結、要求個資等行為，\n請保持警惕並馬上查證！`
    const sourceUrl = host === "s.shopee.tw"
      ? "https://help.shopee.tw/portal/10/article/172901"
      : matched.source
    return { ...address, status: "completed", verdict: "official", summary, highlights: [`經比對為${matched.name}官方網址`], sourceUrl, urlEvidence: "official-list", sourceName: matched.name }
  }

  const service = findReferencedService(
    subdomain ? domainToUnicode(subdomain) : "",
    domainWithoutSuffix ? domainToUnicode(domainWithoutSuffix) : "",
  )
  if (service && domain && domain !== service.domain && !matched) {
    return {
      ...address,
      status: "completed",
      verdict: "risk",
      highlights: ["與官方網域不符"],
      summary: `網址帶有${service.name}的名稱，但主網域與品牌的官方網域不符，建議馬上停止交易，並且千萬不要點開連結！`,
      sourceUrl: service.source,
      urlEvidence: "brand",
      sourceName: service.name,
    }
  }

  return {
    ...address,
    status: "completed",
    verdict: "unknown",
    highlights: [unknownUrlFallback.highlight],
    summary: unknownUrlFallback.summary,
    urlAnalysisStatus: "local",
  }
}

async function checkAccount(accountId: string): Promise<Result> {
  accountId = accountId.replace(/^@/, "").toLowerCase()
  if (!/^[a-z0-9._]+$/.test(accountId)) return { status: "failed", summary: "請輸入 Threads 帳號 ID。" }

  const sql = getDatabase()
  const [entry] = sql
    ? await sql`SELECT case_status, lookup_count, source_url FROM suspicious_accounts WHERE id = ${accountId} LIMIT 1` as {
        case_status: string | null
        lookup_count: number | null
        source_url: string | null
      }[]
    : []
  const found = sql ? Boolean(entry) : accountId === ticketSellerId

  const copy = accountCheckCopy(found)
  return {
    status: "completed",
    verdict: found ? "risk" : "unknown",
    summary: copy.summary,
    highlights: [copy.highlight],
    accountDetails: { lookupCount: entry?.lookup_count ?? 0, caseStatus: entry?.case_status ?? null },
    sourceUrl: entry?.source_url ?? undefined,
  }
}

export async function processSubmission(input: Submission, priorTurns: PriorChatTurn[] = []): Promise<WidgetResponse> {
  const results: WidgetResponse["results"] = {}
  const configuredAi = Boolean(getDatabase() && hasOpenAi())
  if (input.url) results.url = await checkUrl(input.url)
  if (input.accountId) {
    try {
      results.account = await checkAccount(input.accountId)
    } catch {
      results.account = { status: "failed", summary: "帳號查證暫時無法完成，請重試。" }
    }
  }

  const selectedText = input.selectedMessages.map((message) => message.text).join("\n")
  const response: WidgetResponse = {
    results,
    cases: [],
    explanation: null,
    aiStatus: "local",
  }

  // Only the unknown branch needs AI; fixed verdicts never depend on model output.
  if (input.url && results.url?.status === "completed") {
    response.aiStatus = "local"
    if (results.url.verdict === "unknown" && hasOpenAi()) {
      try {
        const analysis = await analyzeUnknownUrl({
          url: input.url, host: results.url.host!, domain: results.url.domain ?? null, subdomain: results.url.subdomain ?? null,
        })
        results.url = { ...results.url, ...analysis, urlAnalysisStatus: "completed" }
        response.aiStatus = "completed"
      } catch {
        results.url.urlAnalysisStatus = "unavailable"
        response.aiStatus = "unavailable"
      }
    }
  }

  if (selectedText) {
    response.aiStatus = "unavailable"
    if (hasOpenAi()) {
      const { relatedCases, retrievalStatus } = await retrieveCandidates(selectedText)
      try {
        const result = await assessDialogue(input.selectedMessages.map(({ text }) => text), relatedCases, retrievalStatus)
        results.dialogue = result
        response.aiStatus = "completed"
        const caseIds = result.dialogueAssessment?.caseIds ?? []
        response.cases = selectedCaseCards(relatedCases, caseIds)
      } catch {
        results.dialogue = { status: "failed", summary: "對話評估暫時無法完成，請稍後重試。" }
      }
    } else {
      results.dialogue = { status: "failed", summary: "對話評估尚未設定 AI，請設定後再試。" }
    }
  }

  // Dialogue assessment already generated its own conclusion, evidence and next step.
  if (!input.text && !input.url && !input.accountId) return response

  if (input.text) {
    response.cases = []
    response.aiStatus = configuredAi ? "unavailable" : "local"
    if (!configuredAi) {
      response.explanation = "可描述對方要求你做什麼，以及使用的交易平台。"
      response.chatSegments = quickChatDisplaySegments([{ text: response.explanation, action: null }], input.text)
      response.suggestedActions = response.chatSegments.flatMap(({ actions }) => actions ?? [])
      results.chat = { status: "completed", summary: "已提供本機預覽建議。" }
      return response
    }

    const queryText = [input.text, ...priorTurns.map(({ question }) => question)].join("\n")
    const { relatedCases, retrievalStatus } = await retrieveCandidates(queryText, input.text)
    try {
      const reply = await replyToChat({
        text: input.text, priorConversation: priorTurns, relatedCases, retrievalStatus,
        results: Object.fromEntries(Object.entries(results).map(([field, result]) =>
          [field, { status: result.status, summary: result.summary, label: field === "url" ? urlResultLabel(result) : undefined }])),
      })
      response.explanation = reply.answer
      response.chatSegments = reply.segments
      response.suggestedActions = reply.suggestedActions
      response.cases = selectedCaseCards(relatedCases, reply.caseIds)
      response.aiStatus = "completed"
      results.chat = { status: "completed", summary: "已完成回覆與案例篩選。", caseSelection: { caseIds: reply.caseIds, retrievalStatus } }
    } catch {
      results.chat = { status: "failed", summary: "小客服暫時無法回覆，請稍後重試。" }
    }
    return response
  }

  return response
}

async function retrieveCandidates(query: string, productContext = query): Promise<{ relatedCases: RelatedCase[]; retrievalStatus: RetrievalStatus }> {
  if (getDatabase()) {
    try {
      const relatedCases = await findCases(query, /門票|演唱會|購票|售票/.test(productContext) ? "門票" : null)
      return { relatedCases, retrievalStatus: "completed" }
    } catch {
      // Both features can still answer from submitted content when retrieval is unavailable.
    }
  }
  return { relatedCases: [], retrievalStatus: "unavailable" }
}
