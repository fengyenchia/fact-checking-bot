import { IconAlertCircle, IconArrowUpRight } from "@tabler/icons-react";

import { CaseCarousel } from "@/components/case-card";

import type { CheckResult, WidgetResponse } from "./types";

export function DomainDetails({ result }: { result: CheckResult }) {
  return (
    <dl className="space-y-1 text-widget-body wrap-anywhere">
      <div>
        <dt className="inline text-widget-subtitle">完整主機 </dt>
        <dd className="inline">{result.host}</dd>
      </div>
      <div>
        <dt className="inline text-widget-subtitle">主網域 </dt>
        <dd className="inline">{result.domain ?? "無"}</dd>
      </div>
      <div>
        <dt className="inline text-widget-subtitle">次網域 </dt>
        <dd className="inline">{result.subdomain || "無"}</dd>
      </div>
    </dl>
  );
}

export function CheckGuidance({ response, showReportLink = true, inChat = false }: { response: WidgetResponse; showReportLink?: boolean; inChat?: boolean }) {
  return (
    <>
        {response.aiStatus === "unavailable" && (
          <p className="flex items-center gap-2 text-widget-note text-orange">
            <IconAlertCircle className="size-4 shrink-0" aria-hidden />
            AI 說明暫時無法產生
          </p>
        )}
        {response.results.chat?.status === "failed" && (
          <p className="text-widget-note text-orange">
            {response.results.chat.summary}
          </p>
        )}
        {response.explanation && (
          <div className={inChat ? undefined : "rounded-widget bg-muted px-3.5 py-3"}>
            <p className="text-widget-body whitespace-pre-wrap [overflow-wrap:anywhere]">
              {response.explanation}
            </p>
          </div>
        )}

        {showReportLink && response.reportUrl === "https://165.npa.gov.tw/#/report/statement" &&
          !(inChat && response.suggestedActions?.includes("report")) && (
          <a
            href={response.reportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded-widget border border-border px-3.5 text-widget-subtitle font-semibold hover:bg-muted active:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            前往 165 報案
            <IconArrowUpRight className="size-4" aria-hidden />
          </a>
        )}
        {!inChat && <CaseCarousel cases={response.cases} />}
    </>
  );
}
