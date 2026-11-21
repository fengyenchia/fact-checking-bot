import { accountCheckCopy } from "@/lib/account-check-copy";
import { CheckReportAction, CheckResultLayout, OtherCheckActions, type FollowUpCheck } from "./check-result-layout";
import type { WidgetTurn } from "./types";

export function AccountCheckResult({ turn, onCheck }: { turn: WidgetTurn; onCheck: (kind: FollowUpCheck) => void }) {
  const result = turn.response.results.account;
  if (!result) return null;

  const reported = result.verdict === "risk";
  const copy = accountCheckCopy(reported);
  const value = result.accountDetails?.lookupCount;
  const count = typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;

  return (
    <CheckResultLayout subject="帳號" title={copy.title} advice={copy.advice}>
      <div aria-label="已查詢人數" className="flex items-center justify-between gap-3 rounded-widget bg-yellow3 px-5 py-4 text-widget-body">
        <span>已查詢人數</span>
        <strong className="text-right tabular-nums">{count.toLocaleString("zh-TW")} 人</strong>
      </div>
      <p className="rounded-widget bg-yellow3 px-5 py-4 text-widget-body">{copy.highlight}</p>
      <p className="text-center text-widget-body whitespace-pre-wrap">{copy.summary}</p>
      {reported ? <CheckReportAction /> : <OtherCheckActions onCheck={onCheck} />}
    </CheckResultLayout>
  );
}
