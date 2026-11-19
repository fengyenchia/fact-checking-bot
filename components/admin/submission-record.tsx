import type { Submission, SubmissionSession } from "@/lib/admin/data"
import { dialogueRiskLabels, urlResultLabel } from "@/components/chatbot/types"
import { DocumentLink } from "./document-link"

const labels: Record<string, string> = {
  dialogue: "對話風險",
  url: "連結查證",
  account: "帳號查證",
  chat: "小客服",
}
const timeFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  dateStyle: "medium",
  timeStyle: "short",
})

function displayTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? timeFormatter.format(date) : value
}

export function SubmissionGroup({ group }: { group: SubmissionSession }) {
  return (
    <section className="space-y-3 rounded-2xl border border-neutral-300 bg-neutral-200 p-4 dark:border-neutral-700 dark:bg-neutral-800" aria-labelledby={`session-${group.id}`}>
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={`session-${group.id}`} className="font-semibold">最近查證 {displayTime(group.latestAt)}</h3>
          <p className="text-sm text-muted-foreground">{group.records.length} 筆查證</p>
        </div>
        <p className="break-all text-xs text-muted-foreground">場次 ID <span className="font-mono">{group.id}</span></p>
      </header>
      {group.records.map((record) => <SubmissionRecord key={record.submission_id} record={record} />)}
    </section>
  )
}

function SubmissionRecord({ record }: { record: Submission }) {
  const { request, response } = record
  const selectedMessages = request.selectedMessages ?? []
  const results = Object.entries(response?.results ?? {})
  const checkTypes = [
    selectedMessages.length > 0 && labels.dialogue,
    request.url && labels.url,
    request.accountId && labels.account,
    request.text && labels.chat,
  ].filter(Boolean).join("、")

  return (
    <details className="rounded-xl border bg-card">
      <summary className="cursor-pointer rounded-xl px-4 py-3 outline-offset-[-2px] focus-visible:outline-2">
        <span className="ml-1 font-medium">{checkTypes || "查證紀錄"}</span>
        <span className="ml-3 text-xs text-muted-foreground">{displayTime(record.created_at)}</span>
      </summary>
      <div className="space-y-5 border-t p-4 text-sm">
        <p className="break-all text-xs text-muted-foreground">提交 {record.submission_id} · 劇本 {record.script_version}</p>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="min-w-0 space-y-2">
            <h4 className="font-semibold">受測者輸入</h4>
            {request.text && <p className="break-all whitespace-pre-wrap">文字：{request.text}</p>}
            {request.url && <p className="break-all">網址：{request.url}</p>}
            {request.accountId && <p className="break-all">帳號：{request.accountId}</p>}
            {selectedMessages.length > 0 && (
              <div>
                <p>勾選訊息</p>
                <ul className="mt-1 space-y-1 rounded-lg bg-muted p-3">
                  {selectedMessages.map((message) => (
                    <li key={message.id} className="break-all whitespace-pre-wrap">{message.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="min-w-0 space-y-2">
            <h4 className="font-semibold">查證回覆</h4>
            {!response && <p className="text-muted-foreground">處理中或尚無回覆。</p>}
            {results.map(([kind, result]) => (
              <div key={kind} className="space-y-2 break-all">
                <p>
                  <span className="font-medium">{labels[kind] ?? kind}：</span>
                  {kind === "url" && <>{urlResultLabel(result)} · </>}
                  {result.dialogueAssessment && <>{dialogueRiskLabels[result.dialogueAssessment.riskLevel]} · </>}
                  {result.summary}{result.status === "failed" && "（可重試）"}
                  {result.sourceUrl && <> · <DocumentLink href={result.sourceUrl}>查證來源</DocumentLink></>}
                </p>
                {result.caseSelection?.retrievalStatus === "unavailable" && <p className="text-muted-foreground">本次案例檢索未完成，小客服僅依輸入內容回覆。</p>}
                {result.dialogueAssessment && (
                  <>
                    {result.dialogueAssessment.evidence.length > 0 && (
                      <ul className="space-y-1 rounded-lg bg-muted p-3">
                        {result.dialogueAssessment.evidence.map((evidence, index) => (
                          <li key={index}>「{evidence.quote}」：{evidence.reason}</li>
                        ))}
                      </ul>
                    )}
                    {result.dialogueAssessment.retrievalStatus === "unavailable" && <p className="text-muted-foreground">本次案例檢索未完成，AI 僅依勾選內容評估。</p>}
                  </>
                )}
              </div>
            ))}
            {response?.explanation && <p className="break-all whitespace-pre-wrap">{response.explanation}</p>}
            {response?.aiStatus === "unavailable" && <p className="text-muted-foreground">AI 說明暫時無法產生。</p>}
            {!!response?.cases?.length && (
              <ul className="space-y-2">
                {response.cases.map((entry) => (
                  <li key={entry.id} className="rounded-lg bg-muted p-3">
                    <p className="font-medium">{entry.title}</p>
                    <p className="mt-1 break-all whitespace-pre-wrap">{entry.summary}</p>
                    <p className="mt-1 text-xs"><DocumentLink href={entry.sourceUrl}>{entry.sourceName}</DocumentLink></p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </details>
  )
}
