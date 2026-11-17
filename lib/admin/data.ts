import "server-only"

import { randomUUID } from "node:crypto"
import { getDatabase } from "@/lib/server/database"
import { caseEmbeddingText, embedText, generateCaseMetadata, hasOpenAi } from "@/lib/server/openai"
import { InvalidAdminInput, parseCaseSourceCity, parseCaseSourceDate, parseSourceUrl, readValue } from "./form-values"
import { requireAdmin } from "./session"

export type CaseRecord = {
  id: string
  title: string
  product_type: string
  method_tags: string[]
  summary: string
  card_summary: string | null
  source_name: string
  source_url: string
  source_date: string
  source_city: string
  included: boolean
}

type CheckResult = { status: string; summary: string; sourceUrl?: string }

export type Submission = {
  session_id: string
  submission_id: string
  script_version: string
  created_at: string
  request: {
    selectedMessages?: { id: string; text: string }[]
    url?: string
    accountId?: string
    text?: string
  }
  response: {
    results?: Record<string, CheckResult>
    explanation?: string | null
    aiStatus?: string
    cases?: { id: string; title: string; summary: string; sourceName: string; sourceUrl: string }[]
  } | null
}

export type SubmissionSession = {
  id: string
  latestAt: string
  records: Submission[]
}

const sessionsPerPage = 10

export async function readSubmissions(session: string, page: number) {
  await requireAdmin()
  const sql = getDatabase()
  if (!sql) return null

  const [records, sessions] = await Promise.all([
    sql`WITH candidates AS (
          SELECT session_id, max(created_at) AS latest_at
          FROM widget_submissions
          WHERE (${session} = '' OR session_id = ${session})
          GROUP BY session_id
          ORDER BY latest_at DESC, session_id DESC
          LIMIT ${sessionsPerPage + 1} OFFSET ${(page - 1) * sessionsPerPage}
        ), session_page AS (
          SELECT session_id, latest_at, count(*) OVER () > ${sessionsPerPage} AS has_more
          FROM candidates
          ORDER BY latest_at DESC, session_id DESC
          LIMIT ${sessionsPerPage}
        )
        SELECT s.session_id, s.submission_id, s.script_version, s.request, s.response, s.created_at,
               p.latest_at, p.has_more
        FROM session_page p JOIN widget_submissions s USING (session_id)
        ORDER BY p.latest_at DESC, p.session_id DESC, s.created_at, s.submission_id`,
    sql`SELECT session_id FROM widget_submissions
        GROUP BY session_id ORDER BY max(created_at) DESC, session_id DESC LIMIT 100`,
  ])
  const rows = records as (Submission & { latest_at: string; has_more: boolean })[]
  const groups = new Map<string, SubmissionSession>()
  for (const record of rows) {
    const group = groups.get(record.session_id)
    if (group) group.records.push(record)
    else groups.set(record.session_id, { id: record.session_id, latestAt: record.latest_at, records: [record] })
  }
  return {
    groups: [...groups.values()],
    more: rows[0]?.has_more ?? false,
    sessions: (sessions as { session_id: string }[]).map((row) => row.session_id),
  }
}

export async function readCases() {
  await requireAdmin()
  const sql = getDatabase()
  if (!sql) return null

  return await sql`SELECT id, title, product_type, method_tags, summary, card_summary,
      source_name, source_url, to_char(source_date, 'YYYY-MM-DD') AS source_date, source_city, included
    FROM cases ORDER BY updated_at DESC, id` as CaseRecord[]
}

async function editableDatabase() {
  await requireAdmin()
  const sql = getDatabase()
  if (!sql) throw new InvalidAdminInput("請先設定 Neon 資料庫。")
  return sql
}

export async function writeCase(id: string | null, form: FormData) {
  const sql = await editableDatabase()
  const productType = readValue(form, "productType", "商品類別", 80, true)
  const summary = readValue(form, "summary", "案例原文", 3000, true)
  const sourceName = readValue(form, "sourceName", "來源機關", 120, true)
  const sourceUrl = parseSourceUrl(readValue(form, "sourceUrl", "來源網址", 2048, true), true)
  const sourceDate = parseCaseSourceDate(readValue(form, "sourceDate", "發布日期", 10, true))
  const sourceCity = parseCaseSourceCity(readValue(form, "sourceCity", "發布縣市", 20, true))

  let previous: (Pick<CaseRecord, "title" | "product_type" | "summary" | "method_tags" | "card_summary">
    & { embedding: string | null; version: string }) | undefined
  if (id) {
    const rows = await sql`SELECT title, product_type, summary, method_tags, card_summary,
      embedding::text AS embedding, updated_at::text AS version FROM cases WHERE id = ${id}`
    previous = rows[0] as typeof previous
    if (!previous) throw new InvalidAdminInput("找不到這筆案例。")
  }

  let title = previous?.title ?? ""
  let methodTags = previous?.method_tags ?? []
  let cardSummary = previous?.card_summary
  let embedding = previous?.embedding
  if (!embedding || !methodTags.length || !cardSummary
    || previous?.product_type !== productType || previous.summary !== summary) {
    if (!hasOpenAi()) throw new InvalidAdminInput("請先設定 OPENAI_API_KEY，再儲存案例。")
    try {
      const generated = await generateCaseMetadata({ productType, summary })
      title = generated.title
      methodTags = generated.methodTags
      cardSummary = generated.cardSummary
    } catch {
      throw new InvalidAdminInput("暫時無法產生案例標題、手法標籤或卡片短摘要，請稍後重試。")
    }
    try {
      embedding = JSON.stringify(await embedText(caseEmbeddingText({ title, productType, summary, methodTags })))
    } catch {
      throw new InvalidAdminInput("暫時無法建立案例檢索資料，請稍後重試。")
    }
  }

  if (!id) {
    await sql`INSERT INTO cases (
        id, title, product_type, method_tags, summary, card_summary, source_name,
        source_url, source_date, source_city, included, embedding
      ) VALUES (
        ${randomUUID()}, ${title}, ${productType}, ${methodTags}::text[], ${summary}, ${cardSummary}, ${sourceName},
        ${sourceUrl}, ${sourceDate}::date, ${sourceCity}, true, ${embedding}::vector
      )`
    return
  }

  const updated = await sql`UPDATE cases SET
    title = ${title}, product_type = ${productType}, method_tags = ${methodTags}::text[],
    summary = ${summary}, card_summary = ${cardSummary}, source_name = ${sourceName},
    source_url = ${sourceUrl}, source_date = ${sourceDate}::date, source_city = ${sourceCity},
    included = true, embedding = ${embedding}::vector, updated_at = now()
    WHERE id = ${id} AND updated_at = ${previous?.version}::timestamptz RETURNING id`
  if (!updated.length) throw new InvalidAdminInput("案例已變更，請重新開啟編輯表單。")
}

export type AccountRecord = {
  id: string
  case_status: string | null
  lookup_count: number | null
  source_url: string | null
}

export async function readAccounts() {
  await requireAdmin()
  const sql = getDatabase()
  if (!sql) return null

  return await sql`SELECT id, case_status, lookup_count, source_url
    FROM suspicious_accounts ORDER BY updated_at DESC, id` as AccountRecord[]
}

export async function writeAccount(id: string | null, form: FormData) {
  const sql = await editableDatabase()
  const accountId = id ?? readValue(form, "id", "Threads 帳號", 60, true).replace(/^@/, "").toLowerCase()
  if (!/^[a-z0-9_.]+$/.test(accountId)) throw new InvalidAdminInput("請填寫 Threads 使用者名稱，例如 giveme_money。")

  const caseStatus = readValue(form, "caseStatus", "案件狀態", 80, true)
  const sourceUrl = parseSourceUrl(readValue(form, "sourceUrl", "資料連結", 2048, true), true)
  const count = readValue(form, "lookupCount", "查詢人數", 10, true)
  const lookupCount = Number(count)
  if (!/^\d+$/.test(count) || lookupCount > 2_147_483_647) {
    throw new InvalidAdminInput("查詢人數請填 0 以上、2,147,483,647 以下的整數。")
  }

  if (id) {
    const updated = await sql`UPDATE suspicious_accounts
      SET case_status = ${caseStatus}, lookup_count = ${lookupCount}, source_url = ${sourceUrl}, updated_at = now()
      WHERE id = ${accountId} RETURNING id`
    if (!updated.length) throw new InvalidAdminInput("找不到這筆帳號。")
    return
  }

  const added = await sql`INSERT INTO suspicious_accounts (id, case_status, lookup_count, source_url)
    VALUES (${accountId}, ${caseStatus}, ${lookupCount}, ${sourceUrl})
    ON CONFLICT DO NOTHING RETURNING id`
  if (!added.length) throw new InvalidAdminInput("這個帳號已列入清單。")
}
