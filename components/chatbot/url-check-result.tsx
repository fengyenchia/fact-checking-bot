import { IconArrowUpRight } from "@tabler/icons-react";

import { CheckGuidance, DomainDetails } from "./chatbot-turn";
import { digiatReportUrl, urlResultLabel, type WidgetTurn } from "./types";

export function UrlCheckResult({ turn }: { turn: WidgetTurn }) {
  const result = turn.response.results.url;
  if (!result) return null;

  const verdict = result.verdict ?? "unknown";
  const isReported = result.urlEvidence === "twnic";
  const status = urlResultLabel(result);
  const sourceName = result.sourceName ?? (result.sourceUrl ? "官方來源" : "暫無可核對來源");
  const statusColor = verdict === "official" ? "bg-green" : verdict === "risk" ? "bg-orange" : "bg-yellow2";

  return (
    <section aria-label="連結查證結果" className="mx-auto w-full max-w-96 space-y-3 px-5 pt-10 pb-3 text-black sm:pt-8">
      <div role="status" className="space-y-1.5 text-center">
        <p className="text-widget-body">此連結</p>
        <h2 className="text-widget-warning text-balance">{status}</h2>
      </div>

      {result.host && (
        <div className="rounded-widget border border-black bg-yellow3 px-4 py-3">
          <DomainDetails result={result} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex min-w-0 flex-col items-center gap-2 rounded-widget border border-black bg-orange2 p-3">
          <span className="self-start text-widget-subtitle">來源</span>
          {result.sourceUrl?.startsWith("https://") ? (
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-0.5 text-center text-widget-body underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="wrap-anywhere">{sourceName}</span>
              <IconArrowUpRight className="size-4 shrink-0" aria-hidden />
            </a>
          ) : (
            <span className="text-center text-widget-body wrap-anywhere">{sourceName}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 rounded-widget border border-black bg-blue p-3">
          <span className="self-start text-widget-subtitle">狀態</span>
          <span aria-hidden className={`size-8 rounded-widget border border-black ${statusColor}`} />
          <span className="text-center text-widget-subtitle wrap-anywhere">{status}</span>
        </div>
      </div>
      <p className="text-center text-widget-body whitespace-pre-wrap wrap-anywhere">{result.summary}</p>
      <CheckGuidance response={turn.response} showReportLink={false} />
      {(verdict === "risk" || isReported) && (
        <div className="space-y-2.5 text-center">
          <p className="text-widget-body">此連結可能包含惡意程式或釣魚網站。<br />是否進行通報？</p>
          <a href={digiatReportUrl} target="_blank" rel="noreferrer" className="btn btn-yellow min-h-11 w-full max-w-60 focus-visible:outline-2 focus-visible:outline-ring">
            前往數發部通報
          </a>
        </div>
      )}
    </section>
  );
}
