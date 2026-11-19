import { CaseCarousel } from "@/components/case-card";

import { dialogueRiskLabels, digiatReportUrl, type WidgetTurn } from "./types";

export function DialogueCheckResult({ turn }: { turn: WidgetTurn }) {
  const { results, cases } = turn.response;
  const result = results.dialogue;
  if (!result) return null;

  const assessment = result.dialogueAssessment;
  if (!assessment) {
    return (
      <section aria-label="對話評估結果" className="mx-auto w-full max-w-96 space-y-3 px-5 pt-10 pb-3 text-center">
        <h2 className="text-widget-title">請重新評估</h2>
        <p role="status" className="text-widget-body">這是先前的評估紀錄，請重新選取訊息，以目前內容進行 AI 評估。</p>
      </section>
    );
  }

  const hasRisk = assessment.riskLevel !== "insufficient";
  const highlights = result.highlights?.length ? result.highlights : [result.summary];

  return (
    <section aria-label="對話評估結果" className="mx-auto w-full max-w-96 space-y-3 px-5 pt-10 pb-3 sm:pt-8">
      <div role="status" className="space-y-1.5 text-center">
        <p className="text-widget-body">此對話</p>
        <h2 className="text-widget-warning">
          {dialogueRiskLabels[assessment.riskLevel]}
        </h2>
        <p className={`text-widget-body ${hasRisk ? "font-semibold text-orange" : ""}`}>
          {hasRisk ? result.summary : "線索不足不代表交易安全，請補充相關訊息。"}
        </p>
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
