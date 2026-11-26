import type { ReactNode } from "react";
import { digiatReportUrl } from "./types";

export type FollowUpCheck = "account" | "dialogue" | "chat";

const actionFocus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const alternatives: { kind: FollowUpCheck; label: string }[] = [
  { kind: "account", label: "帳號查證" },
  { kind: "dialogue", label: "對話評估" },
  { kind: "chat", label: "快速對話" },
];

export function CheckResultLayout({ subject, title, advice, children }: {
  subject: "連結" | "帳號";
  title: string;
  advice: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={`${subject}查證結果`} className="mx-auto w-full max-w-96 space-y-6 px-5 pt-10 pb-3 text-black sm:pt-8">
      <div role="status" className="space-y-5 text-center">
        <p className="text-widget-subtitle">星之助已查核完畢！<br />此{subject}</p>
        <h2 className="text-widget-warning text-balance">{title}</h2>
        <p className="text-widget-subtitle text-orange">{advice}</p>
      </div>
      {children}
    </section>
  );
}

export function OtherCheckActions({ onCheck }: { onCheck: (kind: FollowUpCheck) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {alternatives.map(({ kind, label }) => (
        <button key={kind} type="button" className={`btn btn-yellow min-h-11 ${actionFocus}`} onClick={() => onCheck(kind)}>
          {label}
        </button>
      ))}
      <a href={digiatReportUrl} target="_blank" rel="noreferrer" className={`btn btn-orange min-h-11 ${actionFocus}`}>
        前往通報
      </a>
    </div>
  );
}

export function CheckReportAction() {
  return (
    <div className="text-center">
      <a href={digiatReportUrl} target="_blank" rel="noreferrer" className={`btn btn-orange min-h-11 w-full max-w-60 ${actionFocus}`}>
        前往通報
      </a>
    </div>
  );
}
