import { CheckReportAction, CheckResultLayout, OtherCheckActions, type FollowUpCheck } from "./check-result-layout";
import { unknownUrlFallback, urlResultLabel, type WidgetTurn } from "./types";

export function UrlCheckResult({ turn, onCheck }: { turn: WidgetTurn; onCheck: (kind: FollowUpCheck) => void }) {
  const result = turn.response.results.url;
  if (!result) return null;

  const status = urlResultLabel(result);
  const isUnknown = status === "無法確定";
  const showReport = result.verdict === "risk" || result.urlEvidence === "twnic";
  const advice = isUnknown
    ? "建議使用其他機制進行查證或通報"
    : showReport ? "建議立即停止交易並通報" : "可以點開連結";
  const highlights = result.highlights?.length ? result.highlights : isUnknown ? [unknownUrlFallback.highlight] : [];
  const summary = isUnknown && (Array.from(result.summary).length > 28 || /[\r\n]/.test(result.summary))
    ? unknownUrlFallback.summary : result.summary;

  return (
    <CheckResultLayout subject="連結" title={status} advice={advice}>

      {!!highlights.length && (
        <ul aria-label="連結查證重點" className="space-y-2">
          {highlights.map((highlight) => (
            <li key={highlight} className="rounded-widget bg-yellow3 px-5 py-4 text-widget-body">
              {highlight}
            </li>
          ))}
        </ul>
      )}

      <p className={`text-center text-widget-body whitespace-pre-wrap wrap-anywhere ${isUnknown ? "line-clamp-2" : ""}`}>{summary}</p>

      {showReport && <CheckReportAction />}

      {isUnknown && (
        <div className="space-y-4">
          <p className="text-center text-widget-body">建議先停止交易，利用以下機制再次查證，或是前往通報喔！</p>
          <OtherCheckActions onCheck={onCheck} />
        </div>
      )}
    </CheckResultLayout>
  );
}
