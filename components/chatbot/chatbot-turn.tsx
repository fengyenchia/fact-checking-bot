import { IconAlertCircle, IconArrowUpRight } from "@tabler/icons-react";

import { CaseCard } from "@/components/case-card";

import { checkLabels, type CheckResult, type WidgetTurn } from "./types";

function DomainDetails({ result }: { result: CheckResult }) {
  return (
    <dl className="mt-2 space-y-1 text-xs leading-relaxed [overflow-wrap:anywhere] text-muted-foreground">
      <div><dt className="inline font-semibold">完整主機 </dt><dd className="inline">{result.host}</dd></div>
      <div><dt className="inline font-semibold">主網域 </dt><dd className="inline">{result.domain ?? "無"}</dd></div>
      <div><dt className="inline font-semibold">次網域 </dt><dd className="inline">{result.subdomain || "無"}</dd></div>
    </dl>
  );
}

export function ChatbotTurn({ turn }: { turn: WidgetTurn }) {
  const { input, response } = turn;

  return (
    <article className="space-y-3.5">
      <div className="ml-auto w-fit max-w-[90%] space-y-1.5 rounded-3xl rounded-br-lg bg-foreground px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] text-background">
        {input.text && <p className="whitespace-pre-wrap">{input.text}</p>}
        {input.messageIds && <p>已選取 {input.messageIds.length} 則對話</p>}
        {input.url && <p>{input.url}</p>}
        {input.accountId && <p>{input.accountId}</p>}
      </div>

      <div className="space-y-3.5">
        {Object.entries(response.results).filter(([kind]) => kind !== "chat").map(([kind, item]) => (
          <div key={kind} className="rounded-2xl border border-border px-3.5 py-3">
            <h3 className="text-sm font-semibold">{checkLabels[kind as keyof typeof checkLabels]}</h3>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground">
              {item.summary}
            </p>
            {item.host && <DomainDetails result={item} />}
            {item.sourceUrl?.startsWith("https://") && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex min-h-8 items-center gap-0.5 text-xs font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                官方來源
                <IconArrowUpRight className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        ))}

        {response.aiStatus === "unavailable" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconAlertCircle className="size-4 shrink-0" aria-hidden />
            AI 說明暫時無法產生
          </p>
        )}
        {response.results.chat?.status === "failed" && (
          <p className="text-sm text-muted-foreground">{response.results.chat.summary}</p>
        )}
        {response.explanation && (
          <div className="rounded-2xl rounded-bl-lg bg-muted px-3.5 py-3">
            {response.aiStatus === "local" && (
              <p className="mb-1 text-xs font-semibold text-muted-foreground">本機示範回覆</p>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
              {response.explanation}
            </p>
          </div>
        )}

        {response.cases.length > 0 && (
          <section aria-label="相關案例" className="space-y-2">
            <h3 className="text-sm font-semibold">相關案例</h3>
            {response.cases.map((item) => <CaseCard item={item} key={item.id} />)}
          </section>
        )}
        {response.cases.length === 0 && response.aiStatus !== "unavailable" &&
          (response.results.dialogue?.status === "completed" || response.results.chat?.status === "completed") && (
            <p className="text-sm text-muted-foreground">目前沒有可引用的相關案例。</p>
          )}
        {response.reportUrl === "https://165.npa.gov.tw/#/report/statement" && (
          <a
            href={response.reportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3.5 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            前往 165 報案
            <IconArrowUpRight className="size-4" aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}
