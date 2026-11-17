import Image from "next/image";
import type { Ref } from "react";

import { CaseCarousel } from "@/components/case-card";

import { CheckGuidance } from "./chatbot-turn";
import { checkLabels, digiatReportUrl, type SuggestedCheck, type WidgetTurn } from "./types";

const actionClass = "btn btn-yellow min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function QuickChatLoading() {
  return (
    <div role="status" className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-widget bg-background/60 px-2 text-center backdrop-blur-sm">
      <Image
        src="/pictures/ui/loading.png"
        alt=""
        width={220}
        height={220}
        loading="eager"
        unoptimized
        className="h-auto min-h-0 w-[55%] max-w-55 object-contain motion-safe:animate-spin motion-safe:[animation-duration:1.8s]"
      />
      <span className="text-widget-note">努力讀取中…敬請稍候</span>
    </div>
  );
}

export function QuickChatHistory({ turns, pending, transcriptRef, onCheck }: {
  turns: WidgetTurn[];
  pending: boolean;
  transcriptRef: Ref<HTMLDivElement>;
  onCheck: (kind: SuggestedCheck) => void;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-widget border border-input">
      <div
        ref={transcriptRef}
        role="log"
        aria-label="快速對話紀錄"
        aria-busy={pending}
        inert={pending}
        tabIndex={0}
        className="min-h-0 w-full space-y-4 overflow-y-auto overscroll-contain p-3
          not-supports-[selector(::-webkit-scrollbar)]:scrollbar-thin
          not-supports-[selector(::-webkit-scrollbar)]:scrollbar-thumb-black3
          not-supports-[selector(::-webkit-scrollbar)]:scrollbar-track-[var(--black4)]
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-thumb]:rounded-widget [&::-webkit-scrollbar-thumb]:bg-black3
          [&::-webkit-scrollbar-track]:my-2 [&::-webkit-scrollbar-track]:rounded-widget [&::-webkit-scrollbar-track]:bg-[var(--black4)]"
      >
        {turns.map(({ submissionId, input, response }) => (
          <article key={submissionId} className="space-y-3">
            {input.text && (
              <p className="ml-auto w-fit max-w-[85%] rounded-widget bg-muted px-3 py-2 text-widget-body wrap-anywhere whitespace-pre-wrap">{input.text}</p>
            )}
            <div className="flex items-start gap-2">
              <Image src="/pictures/ui/customer_service_avatar.png" alt="客服" width={32} height={32} unoptimized className="size-8 shrink-0 object-contain" />
              <div className="min-w-0 flex-1 space-y-2">
                <CheckGuidance response={response} inChat />
                {!!response.suggestedActions?.length && (
                  <div className="flex flex-wrap gap-2">
                    {response.suggestedActions.map((kind) => kind === "report" ? (
                      <a key={kind} className={actionClass} href={digiatReportUrl} target="_blank" rel="noreferrer">
                        前往數發部通報
                      </a>
                    ) : (
                      <button key={kind} type="button" onClick={() => onCheck(kind)} className={actionClass}>
                        前往{checkLabels[kind]}
                      </button>
                    ))}
                  </div>
                )}
                <CaseCarousel cases={response.cases} />
              </div>
            </div>
          </article>
        ))}
      </div>
      {pending && <QuickChatLoading />}
    </div>
  );
}
