"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  IconArrowUp,
  IconCircleCheck,
  IconLoader2,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

import { ChatbotTurn } from "./chatbot-turn";
import { CheckInputs } from "./check-inputs";
import {
  checkLabels,
  type CheckTab,
  type WidgetInput,
  type WidgetResponse,
  type WidgetTurn,
} from "./types";

type ChatbotWidgetProps = {
  sessionId: string;
  scriptVersion: string;
  messages: readonly { id: string; text: string }[];
  dialogueSelecting: boolean;
  onDialogueSelectingChange: (selecting: boolean) => void;
  selectedMessageIds: readonly string[];
  onSelectedMessageIdsChange: (ids: string[]) => void;
};

const floatingPosition = "absolute right-4 bottom-20 z-40";

function loadTurns(sessionId: string) {
  if (typeof window === "undefined") return [];
  try {
    const turns: unknown = JSON.parse(sessionStorage.getItem(`threads-checks:${sessionId}`) ?? "[]");
    return Array.isArray(turns) ? turns as WidgetTurn[] : [];
  } catch {
    return [];
  }
}

export function ChatbotWidget({
  sessionId,
  scriptVersion,
  messages,
  dialogueSelecting,
  onDialogueSelectingChange,
  selectedMessageIds,
  onSelectedMessageIdsChange,
}: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CheckTab | null>(null);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [accountId, setAccountId] = useState("");
  const [turns, setTurns] = useState<WidgetTurn[]>(() => loadTurns(sessionId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const selectionBeforeEdit = useRef<string[]>([]);
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const requestInProgress = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const selectButton = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      sessionStorage.setItem(`threads-checks:${sessionId}`, JSON.stringify(turns));
    } catch {
      // Storage can be unavailable in some browser modes.
    }
  }, [sessionId, turns]);

  useEffect(() => {
    if (open && transcript.current) {
      transcript.current.scrollTop = transcript.current.scrollHeight;
    }
  }, [open, turns, pending]);

  useEffect(() => {
    if (dialogueSelecting) selectButton.current?.focus();
  }, [dialogueSelecting]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const element = popup.current;
    if (!open || dialogueSelecting || !viewport || !element) return;

    function syncViewport() {
      if (!viewport || !element) return;
      const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      element.style.setProperty("--widget-viewport-height", `${viewport.height}px`);
      element.style.setProperty("--widget-viewport-bottom", `${keyboardInset}px`);
    }

    syncViewport();
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);
    return () => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
    };
  }, [open, dialogueSelecting]);

  const selectedMessages = messages.filter(({ id }) => selectedMessageIds.includes(id));
  const hasInput = Boolean(text.trim() || url.trim() || accountId.trim() || selectedMessages.length);
  const capsules = [
    selectedMessages.length > 0 && {
      label: `對話 ${selectedMessages.length} 則`,
      clear: () => onSelectedMessageIdsChange([]),
    },
    url.trim() && { label: checkLabels.url, clear: () => setUrl("") },
    accountId.trim() && { label: checkLabels.account, clear: () => setAccountId("") },
  ];

  function beginDialogueSelection() {
    selectionBeforeEdit.current = [...selectedMessageIds];
    onDialogueSelectingChange(true);
  }

  function endDialogueSelection(cancel: boolean) {
    if (cancel) onSelectedMessageIdsChange(selectionBeforeEdit.current);
    onDialogueSelectingChange(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasInput || requestInProgress.current) return;
    const input: WidgetInput = {
      text: text.trim() || undefined,
      url: url.trim() || undefined,
      accountId: accountId.trim() || undefined,
      messageIds: selectedMessages.length ? selectedMessages.map(({ id }) => id) : undefined,
    };
    const fingerprint = JSON.stringify(input);
    if (submission.current?.fingerprint !== fingerprint) {
      submission.current = { fingerprint, id: crypto.randomUUID() };
    }
    const submissionId = submission.current.id;

    requestInProgress.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, submissionId, sessionId, scriptVersion }),
      });
      const body = await response.json() as WidgetResponse | { error: string };
      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : "查證暫時無法完成，請再試一次。");
        return;
      }

      setTurns((current) => [...current, {
        submissionId,
        input,
        response: body,
      }]);
      if (body.results.chat?.status === "completed") setText("");
      if (body.results.url?.status === "completed") setUrl("");
      if (body.results.account?.status === "completed") setAccountId("");
      if (body.results.dialogue?.status === "completed") onSelectedMessageIdsChange([]);
      submission.current = null;
    } catch {
      setError("連線暫時中斷，請再試一次。");
    } finally {
      requestInProgress.current = false;
      setPending(false);
    }
  }

  return (
    <>
      {dialogueSelecting && (
        <div className={`${floatingPosition} left-4 mx-auto flex max-w-sm items-center justify-between gap-1 rounded-2xl border border-border bg-background p-2 pl-4 shadow-lg`}>
          <p className="text-sm font-semibold" aria-live="polite">已選 {selectedMessages.length} 則</p>
          <div className="flex gap-1">
            <Button variant="ghost" className="h-11 rounded-full px-3" onClick={() => endDialogueSelection(true)}>取消</Button>
            <Button ref={selectButton} className="h-11 rounded-full px-3" onClick={() => endDialogueSelection(false)}>
              <IconCircleCheck aria-hidden />
              完成
            </Button>
          </div>
        </div>
      )}

      <Dialog.Root open={open && !dialogueSelecting} onOpenChange={setOpen}>
        <Dialog.Trigger
          ref={triggerRef}
          hidden={dialogueSelecting}
          className={`${floatingPosition} inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&[hidden]]:hidden`}
        >
          <IconShieldCheck aria-hidden size={18} stroke={1.9} />
          查證
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/25" />
          <Dialog.Popup
            ref={popup}
            initialFocus={headingRef}
            finalFocus={dialogueSelecting ? false : triggerRef}
            style={{
              "--widget-viewport-height": "100dvh",
              "--widget-viewport-bottom": "0px",
            } as CSSProperties}
            className="fixed inset-x-0 bottom-[var(--widget-viewport-bottom)] z-50 flex h-[min(42rem,86dvh,var(--widget-viewport-height))] flex-col outline-none sm:inset-x-auto sm:right-4 sm:bottom-[calc(11rem+env(safe-area-inset-bottom))] sm:h-[min(39rem,calc(100dvh-12rem))] sm:w-105"
          >
            <motion.div
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-3xl border border-border bg-background text-foreground shadow-xl sm:rounded-3xl"
              initial={reducedMotion ? false : { y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.17, ease: "easeOut" }}
            >
              <header className="flex shrink-0 items-center justify-between border-b border-border py-1.5 pr-2 pl-4">
                <Dialog.Title ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
                  查證
                </Dialog.Title>
                <Dialog.Close
                  aria-label="關閉查證"
                  className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <IconX aria-hidden size={21} stroke={1.8} />
                </Dialog.Close>
              </header>
              <CheckInputs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedCount={selectedMessages.length}
                beginDialogueSelection={beginDialogueSelection}
                url={url}
                setUrl={setUrl}
                accountId={accountId}
                setAccountId={setAccountId}
                pending={pending}
              />
              <div
                ref={transcript}
                role="log"
                aria-label="查證紀錄"
                className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4"
              >
                {turns.length === 0 && !pending && (
                  <p className="text-sm text-muted-foreground">選擇上方的查證方式，或輸入想問的問題。</p>
                )}
                {turns.map((turn) => <ChatbotTurn key={turn.submissionId} turn={turn} />)}
                {pending && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IconLoader2 aria-hidden className="size-4 motion-safe:animate-spin" />
                    查證中…
                  </p>
                )}
              </div>
              <form
                onSubmit={submit}
                className="shrink-0 border-t border-border px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              >
                {error && <p role="alert" className="mb-2 px-1 text-sm text-destructive">{error}</p>}
                <div className="rounded-3xl border border-border bg-background px-2 py-1.5 focus-within:border-ring">
                  {capsules.some(Boolean) && (
                    <div className="flex flex-wrap gap-1 px-1 pt-1">
                      {capsules.map((item) => item && (
                        <button
                          key={item.label}
                          type="button"
                          disabled={pending}
                          aria-label={`移除${item.label}`}
                          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
                          onClick={item.clear}
                        >
                          {item.label}
                          <IconX aria-hidden size={13} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-1">
                    <textarea
                      rows={1}
                      aria-label="詢問小客服"
                      placeholder="輸入想問的問題…"
                      maxLength={1000}
                      className="max-h-28 min-h-11 min-w-0 flex-1 resize-none field-sizing-content px-2 py-2.5 text-base leading-6 outline-none placeholder:text-muted-foreground"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      disabled={pending}
                    />
                    <Button
                      type="submit"
                      className="size-11 rounded-full"
                      aria-label="送出查證"
                      disabled={pending || !hasInput}
                    >
                      {pending ? <IconLoader2 aria-hidden className="size-5 motion-safe:animate-spin" /> : <IconArrowUp aria-hidden className="size-5" stroke={2.2} />}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
