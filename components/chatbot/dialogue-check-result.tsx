import { CaseCarousel } from "@/components/case-card";

import { digiatReportUrl, type WidgetTurn } from "./types";

export function DialogueCheckResult({ turn }: { turn: WidgetTurn }) {
  const { results, cases } = turn.response;
  const result = results.dialogue;
  if (!result) return null;

  const hasRisk = result.verdict === "risk";
  const highlights = result.highlights?.length ? result.highlights : [result.summary];

  return (
    <section aria-label="對話評估結果" className="mx-auto w-full max-w-96 space-y-3 px-5 pt-10 pb-3 sm:pt-8">
      <div role="status" className="space-y-1.5 text-center">
        <p className="text-widget-body">此對話具</p>
        <h2 className={hasRisk ? "text-widget-warning" : "text-widget-title"}>
          {hasRisk ? "極高風險" : "有限線索"}
        </h2>
        {hasRisk && <p className="text-widget-body font-semibold text-orange">建議立即停止交易</p>}
      </div>
      <ul aria-label="評估重點" className="space-y-2">
        {highlights.map((highlight) => (
          <li key={highlight} className="rounded-widget bg-yellow3 px-4 py-2.5 text-widget-body text-black">
            {highlight}
          </li>
        ))}
      </ul>
      {hasRisk && (
        <div className="space-y-2 text-center">
          <p className="text-widget-body">上述對話可能包含詐騙行為。<br />是否進行通報？</p>
          <a href={digiatReportUrl} target="_blank" rel="noreferrer" className="btn btn-yellow min-h-11 focus-visible:outline-2 focus-visible:outline-ring">
            前往數發部通報
          </a>
        </div>
      )}
      <CaseCarousel cases={cases} />
    </section>
  );
}
