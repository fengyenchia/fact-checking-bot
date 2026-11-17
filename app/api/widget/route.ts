import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/server/database"
import { processSubmission, validateSubmission, type PriorChatTurn, type WidgetResponse } from "@/lib/server/verification"

const maxBodySize = 16_000
const responseHeaders = { "Cache-Control": "no-store" }

function json(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: responseHeaders })
}

async function readBody(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) throw new Error("沒有收到查證資料")

  const decoder = new TextDecoder()
  let size = 0
  let body = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBodySize) {
      await reader.cancel()
      throw new Error("輸入內容過長")
    }
    body += decoder.decode(value, { stream: true })
  }
  return JSON.parse(body + decoder.decode()) as unknown
}

type Submission = ReturnType<typeof validateSubmission>

type LocalSubmission = {
  request: string
  expiresAt: number
  response: Promise<WidgetResponse>
}

const localSubmissions = new Map<string, LocalSubmission>()

async function processLocalSubmission(input: Submission) {
  const key = `${input.sessionId}/${input.submissionId}`
  const request = JSON.stringify(input)
  const now = Date.now()
  for (const [id, record] of localSubmissions) {
    if (record.expiresAt <= now) localSubmissions.delete(id)
  }
  const existing = localSubmissions.get(key)
  if (existing) {
    if (existing.request !== request) return json({ error: "提交內容與原紀錄不符。" }, 409)
    return json(await existing.response)
  }
  if (localSubmissions.size >= 100) {
    const oldest = localSubmissions.keys().next().value
    if (oldest) localSubmissions.delete(oldest)
  }
  const response = processSubmission(input)
  localSubmissions.set(key, { request, expiresAt: now + 300_000, response })
  return json(await response)
}

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "請從查證工具送出資料。" }, 403)
  }
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()
  if (contentType !== "application/json") {
    return json({ error: "查證資料格式不符。" }, 415)
  }

  let input: Submission
  try {
    input = validateSubmission(await readBody(request))
  } catch (error) {
    return json({ error: error instanceof SyntaxError ? "查證資料格式不符。" : (error as Error).message }, 400)
  }

  try {
    const sql = getDatabase()
    if (!sql) return await processLocalSubmission(input)

    const body = JSON.stringify(input)
    const { sessionId, submissionId, scriptVersion } = input
    const [claim] = await sql`
      INSERT INTO widget_submissions (session_id, submission_id, script_version, request)
      VALUES (${sessionId}, ${submissionId}, ${scriptVersion}, ${body}::jsonb)
      ON CONFLICT (session_id, submission_id) DO UPDATE SET started_at = now()
      WHERE widget_submissions.response IS NULL
        AND widget_submissions.started_at < now() - interval '90 seconds'
        AND widget_submissions.request = excluded.request
      RETURNING started_at::text AS claim
    `

    if (!claim) {
      const [existing] = await sql`
        SELECT response, request = ${body}::jsonb AS same_request FROM widget_submissions
        WHERE session_id = ${sessionId} AND submission_id = ${submissionId}
      `
      if (!existing?.same_request) return json({ error: "提交內容與原紀錄不符。" }, 409)
      if (existing.response) return json(existing.response)
      return json({ error: "查證仍在處理中，請稍後重試。" }, 409)
    }

    let priorTurns: PriorChatTurn[] = []
    if (input.text) {
      const previous = await sql`
        SELECT left(request->>'text', 300) AS question, left(response->>'explanation', 400) AS answer
        FROM widget_submissions
        WHERE session_id = ${sessionId} AND script_version = ${scriptVersion}
          AND submission_id <> ${submissionId}
          AND response->'results'->'chat'->>'status' = 'completed'
          AND request->>'text' IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 2
      `
      priorTurns = previous.reverse().map((row) => ({
        question: String(row.question),
        answer: typeof row.answer === "string" ? row.answer : null,
      }))
    }

    const output = await processSubmission(input, priorTurns)
    const [saved] = await sql`
      UPDATE widget_submissions SET response = ${JSON.stringify(output)}::jsonb
      WHERE session_id = ${sessionId} AND submission_id = ${submissionId}
        AND response IS NULL AND started_at = ${claim.claim}::timestamptz
      RETURNING response
    `
    if (!saved) return json({ error: "查證紀錄正在更新，請重試。" }, 409)
    return json(output)
  } catch {
    return json({ error: "查證暫時無法完成，請稍後重試。" }, 503)
  }
}
