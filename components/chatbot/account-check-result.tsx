import { IconBrandFacebookFilled, IconBrandThreads, IconExternalLink } from "@tabler/icons-react";

import { digiatReportUrl, type WidgetTurn } from "./types";

function getAccountSource(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.replace(/^www\./, "");
    if (host === "facebook.com" || host.endsWith(".facebook.com")) {
      return { href: url.href, label: "FB", Icon: IconBrandFacebookFilled, color: "text-[#0866ff]" };
    }
    if (host === "threads.com" || host === "threads.net") {
      return { href: url.href, label: "Threads", Icon: IconBrandThreads, color: "text-black" };
    }
    return { href: url.href, label: host, Icon: IconExternalLink, color: "text-black" };
  } catch {
    return null;
  }
}

export function AccountCheckResult({ turn }: { turn: WidgetTurn }) {
  const result = turn.response.results.account;
  if (!result) return null;

  if (result.verdict !== "risk") {
    return (
      <section aria-label="帳號查證結果" className="mx-auto w-full max-w-96 px-5 pt-12 text-center">
        <p role="status" className="text-widget-body">目前查無此帳號的資料。</p>
      </section>
    );
  }

  const count = result.accountDetails?.lookupCount;
  const status = result.accountDetails?.caseStatus?.trim() || "高風險";
  const isUnderReview = status === "核實中" || status === "正在核實";
  const source = getAccountSource(result.sourceUrl);

  return (
    <section aria-label="帳號查證結果" className="mx-auto w-full max-w-96 space-y-3 px-5 pt-10 pb-3 text-black sm:pt-8">
      <div role="status" className="space-y-1.5 text-center">
        <p className="text-widget-body">此帳號具</p>
        <h2 className="text-widget-warning">
          {isUnderReview ? "潛在風險" : "高風險"}
        </h2>
      </div>
      <p className="text-center text-widget-body">依可疑帳號清單資料</p>
      {count != null && (
        <div className="grid min-h-24 grid-cols-[minmax(3.75rem,1fr)_minmax(0,auto)_minmax(3.75rem,1fr)] items-center gap-2 rounded-widget border border-black bg-yellow3 p-3">
          <span className="self-start text-widget-subtitle">已查詢<br />人數</span>
          <strong className="text-center text-widget-warning wrap-anywhere tabular-nums">{count.toLocaleString("zh-TW")}</strong>
          <span className="self-end justify-self-end text-widget-subtitle">人</span>
        </div>
      )}
      <div className={source ? "grid grid-cols-2 gap-2.5" : "grid grid-cols-1"}>
        {source && (
          <a href={source.href} target="_blank" rel="noreferrer" className="flex min-w-0 flex-col items-center gap-1 rounded-widget border border-black bg-orange2 p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="self-start text-widget-subtitle">來源</span>
            <source.Icon className={`size-9 ${source.color}`} aria-hidden />
            <span className="text-center text-widget-subtitle wrap-anywhere">{source.label}</span>
          </a>
        )}
        <div className="flex min-w-0 flex-col items-center gap-1 rounded-widget border border-black bg-blue p-3">
          <span className="self-start text-widget-subtitle">狀態</span>
          <span aria-hidden className={`size-8 rounded-widget border border-black ${isUnderReview ? "bg-yellow2" : "bg-orange"}`} />
          <span className="text-center text-widget-subtitle wrap-anywhere">{status}</span>
        </div>
      </div>
      <div className="space-y-2.5 text-center">
        <p className="text-widget-body">此帳號活動可能包含詐騙行為。<br />是否進行通報？</p>
        <a href={digiatReportUrl} target="_blank" rel="noreferrer" className="btn btn-yellow min-h-11 w-full max-w-60 focus-visible:outline-2 focus-visible:outline-ring">
          前往數發部通報
        </a>
      </div>
    </section>
  );
}
