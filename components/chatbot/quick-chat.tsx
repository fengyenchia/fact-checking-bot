import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { Ref } from "react";

import { CaseCarousel } from "@/components/case-card";

import { QuickChatReply } from "./quick-chat-reply";
import {
  type SuggestedCheck,
  type WidgetTurn,
} from "./types";

export function QuickChatLoading() {
  return (
    <div
      role="status"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-widget bg-background/60 px-2 text-center backdrop-blur-sm"
    >
      <Image
        src="/pictures/ui/loading.png"
        alt=""
        width={220}
        height={220}
        loading="eager"
        unoptimized
        className="h-auto min-h-0 w-[55%] max-w-55 object-contain motion-safe:animate-spin motion-safe:[animation-duration:1.8s]"
      />
      <span className="text-widget-note text-black">努力讀取中…敬請稍候</span>
    </div>
  );
}

export function QuickChatHistory({
  turns,
  pending,
  transcriptRef,
  onCheck,
}: {
  turns: WidgetTurn[];
  pending: boolean;
  transcriptRef: Ref<HTMLDivElement>;
  onCheck: (kind: SuggestedCheck) => void;
}) {
  const reducedMotion = useReducedMotion();

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
          <article key={submissionId} data-chat-turn={submissionId} className="space-y-3 last:min-h-full">
            {input.text && (
              <p className="ml-auto w-fit max-w-[85%] rounded-widget bg-muted px-3 py-2 text-widget-body wrap-anywhere whitespace-pre-wrap">
                {input.text}
              </p>
            )}
            <motion.div
              className="flex items-start gap-2"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
            >
              <Image
                src="/pictures/ui/customer_service_avatar.png"
                alt="客服"
                width={32}
                height={32}
                loading="eager"
                unoptimized
                className="size-8 shrink-0 object-contain"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <QuickChatReply response={response} onCheck={onCheck} />
                <CaseCarousel cases={response.cases} />
              </div>
            </motion.div>
          </article>
        ))}
      </div>
      {pending && <QuickChatLoading />}
    </div>
  );
}
