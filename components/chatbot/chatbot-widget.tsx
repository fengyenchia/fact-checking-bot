"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  IconChevronLeft,
  IconHomeFilled,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { preload } from "react-dom";

import { parseWidgetUrl } from "@/lib/widget-url";
import { AccountCheckResult } from "./account-check-result";
import { CheckGuide, CheckInput, CheckMenu } from "./check-inputs";
import { DialogueCheckResult } from "./dialogue-check-result";
import { QuickChatHistory } from "./quick-chat";
import {
  checkLabels,
  checkImageUrls,
  type CheckKind,
  type WidgetInput,
  type WidgetResponse,
  type WidgetTurn,
} from "./types";
import { UrlCheckResult } from "./url-check-result";

import Image from "next/image";

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
const actionFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const panelAction = `btn btn-black size-11 p-0 ${actionFocus}`;
const checkBody = "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain";
const checkIntroSpacing = "gap-5 pt-5";
const checkPrompts: Record<Exclude<CheckKind, "dialogue">, string> = {
  url: "對方傳來可疑連結嗎？\n先別點開！馬上幫你檢查看看 (*_*)",
  account: "懷疑對方是可疑帳號？\n開始對話前先幫你檢查看看 (*_*)",
  chat: "不確定怎麼開始查證？\n放輕鬆，直接跟我們說說吧～",
};

function turnMatchesKind({ input }: WidgetTurn, kind: CheckKind) {
  switch (kind) {
    case "chat":
      return Boolean(input.text);
    case "url":
      return Boolean(input.url);
    case "account":
      return Boolean(input.accountId);
    case "dialogue":
      return Boolean(input.messageIds?.length);
  }
}

function loadTurns(sessionId: string) {
  if (typeof window === "undefined") return [];
  try {
    const turns: unknown = JSON.parse(
      sessionStorage.getItem(`threads-checks:${sessionId}`) ?? "[]",
    );
    return Array.isArray(turns) ? (turns as WidgetTurn[]) : [];
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
  const [activeKind, setActiveKind] = useState<CheckKind | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [accountId, setAccountId] = useState("");
  const [turns, setTurns] = useState<WidgetTurn[]>(() => loadTurns(sessionId));
  const [pendingKind, setPendingKind] = useState<CheckKind | null>(null);
  const [errors, setErrors] = useState<Partial<Record<CheckKind, string>>>({});
  const [invalidUrl, setInvalidUrl] = useState(false);
  const [detailResultId, setDetailResultId] = useState<string | null>(null);
  const urlErrorId = useId();
  const popup = useRef<HTMLDivElement>(null);
  const selectionBeforeEdit = useRef<string[]>([]);
  const submissions = useRef<
    Partial<Record<CheckKind, { fingerprint: string; id: string }>>
  >({});
  const requestInProgress = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const selectionHeading = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();
  const detailResult =
    activeKind && activeKind !== "chat" && detailResultId
      ? turns.find((turn) => turn.submissionId === detailResultId && turnMatchesKind(turn, activeKind))
      : undefined;
  const showingDetailResult = Boolean(detailResult);

  useEffect(() => {
    const images = [
      "/pictures/covers/home.png",
      ...Object.values(checkImageUrls),
      "/pictures/ui/loading.png",
      "/pictures/ui/customer_service_avatar.png",
    ];
    for (const src of images) preload(src, { as: "image" });
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        `threads-checks:${sessionId}`,
        JSON.stringify(turns),
      );
    } catch {
      // Storage can be unavailable in some browser modes.
    }
  }, [sessionId, turns]);

  useLayoutEffect(() => {
    const panel = transcript.current;
    if (!open || !panel) return;
    if (showingDetailResult) {
      panel.scrollTop = 0;
      return;
    }
    if (activeKind === "chat") {
      const chatTurns = panel.querySelectorAll<HTMLElement>("[data-chat-turn]");
      const latestTurn = chatTurns.item(chatTurns.length - 1);
      if (latestTurn) {
        if (pendingKind === "chat") return;
        const padding = Number.parseFloat(window.getComputedStyle(panel).paddingTop) || 0;
        panel.scrollTop = chatTurns.length === 1 ? 0 : Math.max(
          0,
          panel.scrollTop + latestTurn.getBoundingClientRect().top - panel.getBoundingClientRect().top - padding,
        );
        return;
      }
    }
    panel.scrollTop = panel.scrollHeight;
  }, [open, activeKind, dialogueSelecting, turns, pendingKind, invalidUrl, showingDetailResult]);

  useLayoutEffect(() => {
    const panel = transcript.current;
    const field = document.activeElement;
    if (open && activeKind === "chat" && text && panel && field instanceof HTMLTextAreaElement && panel.contains(field)) {
      panel.scrollTop = panel.scrollHeight;
    }
  }, [open, activeKind, text]);

  useEffect(() => {
    if (open && !dialogueSelecting) headingRef.current?.focus({ preventScroll: true });
  }, [open, activeKind, dialogueSelecting, showingDetailResult, showInstructions]);

  useEffect(() => {
    if (dialogueSelecting) selectionHeading.current?.focus({ preventScroll: true });
  }, [dialogueSelecting]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const element = popup.current;
    if (!open || dialogueSelecting || !viewport || !element) return;

    function syncViewport() {
      if (!viewport || !element) return;
      const keyboardInset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      element.style.setProperty(
        "--widget-viewport-height",
        `${viewport.height}px`,
      );
      element.style.setProperty(
        "--widget-viewport-bottom",
        `${keyboardInset}px`,
      );
    }

    syncViewport();
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);
    return () => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
    };
  }, [open, dialogueSelecting]);

  const selectedMessages = messages.filter(({ id }) =>
    selectedMessageIds.includes(id),
  );
  const drafts: Record<CheckKind, WidgetInput> = {
    chat: { text },
    url: { url },
    account: { accountId },
    dialogue: { messageIds: selectedMessages.map(({ id }) => id) },
  };
  const values = { chat: text, url, account: accountId };
  const setters = { chat: setText, url: setUrl, account: setAccountId };
  const activeTurns = activeKind
    ? turns.filter((turn) => turnMatchesKind(turn, activeKind))
    : [];
  const pending = activeKind !== null && pendingKind === activeKind;
  const accountLoading = pending && activeKind === "account";
  const showCheckSpinner = accountLoading || (pending && activeKind === "url");
  const accountLoadingButtonStyle = accountLoading ? "disabled:opacity-100" : "";
  const showingChatHistory = activeKind === "chat" && activeTurns.length > 0;
  const showChatIntro = activeKind === "chat";
  const coverSpacing = activeKind === null
    ? "max-h-[30cqh] w-auto shrink-0 object-contain pt-4"
    : showChatIntro || activeKind === "dialogue" ? "shrink-0" : "my-auto shrink-0";
  const coverImage = (
    <Image
      src={showCheckSpinner
        ? "/pictures/ui/loading.png"
        : activeKind ? checkImageUrls[activeKind] : "/pictures/covers/home.png"}
      alt=""
      width={220}
      height={220}
      loading="eager"
      unoptimized
      className={`mx-auto ${coverSpacing} ${showCheckSpinner ? "motion-safe:animate-spin motion-safe:[animation-duration:1.8s]" : ""}`}
    />
  );
  const hasInput =
    activeKind === "dialogue"
      ? selectedMessages.length > 0
      : activeKind !== null && Boolean(values[activeKind].trim());
  const error = activeKind && errors[activeKind];

  function resetInput(kind: CheckKind) {
    if (kind === "dialogue") onSelectedMessageIdsChange([]);
    else setters[kind]("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setActiveKind(null);
      setShowInstructions(false);
      setDetailResultId(null);
    }
  }

  function beginDialogueSelection() {
    selectionBeforeEdit.current = [...selectedMessageIds];
    setDetailResultId(null);
    setActiveKind("dialogue");
    onDialogueSelectingChange(true);
  }

  function cancelDialogueSelection() {
    onSelectedMessageIdsChange(selectionBeforeEdit.current);
    setActiveKind(null);
    onDialogueSelectingChange(false);
  }

  function openRelatedCheck(kind: CheckKind) {
    if (kind === "dialogue") beginDialogueSelection();
    else {
      setDetailResultId(null);
      setActiveKind(kind);
    }
  }

  async function submit(kind: CheckKind) {
    const filled = kind === "dialogue" ? selectedMessages.length > 0 : Boolean(values[kind].trim());
    if (!filled || requestInProgress.current) return;
    if (kind === "url" && !parseWidgetUrl(url)) {
      if (invalidUrl && transcript.current) {
        transcript.current.scrollTop = transcript.current.scrollHeight;
      }
      setInvalidUrl(true);
      setErrors((current) => ({ ...current, url: undefined }));
      return;
    }
    const inputs: Record<CheckKind, WidgetInput> = {
      chat: { text: text.trim() },
      url: { url: url.trim() },
      account: { accountId: accountId.trim() },
      dialogue: drafts.dialogue,
    };
    const input = inputs[kind];
    const fingerprint = JSON.stringify(input);
    const previous = submissions.current[kind];
    const submissionId =
      previous?.fingerprint === fingerprint ? previous.id : crypto.randomUUID();
    submissions.current[kind] = { fingerprint, id: submissionId };

    requestInProgress.current = true;
    setPendingKind(kind);
    if (kind === "dialogue") onDialogueSelectingChange(false);
    setErrors((current) => ({ ...current, [kind]: undefined }));
    try {
      const response = await fetch("/api/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          submissionId,
          sessionId,
          scriptVersion,
        }),
      });
      const body = (await response.json()) as
        | WidgetResponse
        | { error: string };
      if (!response.ok || "error" in body) {
        const message =
          "error" in body ? body.error : "查證暫時無法完成，請再試一次。";
        setErrors((current) => ({ ...current, [kind]: message }));
        return;
      }

      setTurns((current) => [
        ...current,
        {
          submissionId,
          input,
          response: body,
        },
      ]);
      const result = body.results[kind];
      if (result?.status === "completed") {
        resetInput(kind);
        if (kind !== "chat") setDetailResultId(submissionId);
      } else if (kind !== "chat") {
        setErrors((current) => ({
          ...current,
          [kind]: result?.summary ?? "查證暫時無法完成，請再試一次。",
        }));
      }
      delete submissions.current[kind];
    } catch {
      setErrors((current) => ({
        ...current,
        [kind]: "連線暫時中斷，請再試一次。",
      }));
    } finally {
      requestInProgress.current = false;
      setPendingKind(null);
    }
  }

  return (
    <>
      {dialogueSelecting && (
        <section aria-labelledby="dialogue-selection-title" className="widget-font relative z-40 w-full max-w-sm shrink-0 self-center rounded-widget border border-border bg-background px-4 pt-3 pb-4 text-center shadow-lg">
          <h2 id="dialogue-selection-title" ref={selectionHeading} tabIndex={-1} className="text-widget-title mb-2 outline-none">對話評估</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`btn btn-black min-h-11 ${actionFocus}`}
              onClick={cancelDialogueSelection}
            >
              取消
            </button>
            <button
              type="button"
              className={`btn btn-yellow min-h-11 ${actionFocus}`}
              disabled={selectedMessages.length === 0 || pendingKind !== null}
              onClick={() => void submit("dialogue")}
            >
              確定送出
            </button>
          </div>
        </section>
      )}

      <Dialog.Root
        open={open && !dialogueSelecting}
        onOpenChange={handleOpenChange}
      >
        <Dialog.Trigger
          ref={triggerRef}
          hidden={dialogueSelecting}
          className={`${floatingPosition} btn-yellow inline-flex min-h-12 cursor-pointer items-center gap-1.5 rounded-widget border border-border px-3.5 text-sm font-semibold shadow-md transition-colors active:duration-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&[hidden]]:hidden`}
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
            style={
              {
                "--widget-viewport-height": "100dvh",
                "--widget-viewport-bottom": "0px",
              } as CSSProperties
            }
            className="widget-font fixed inset-x-0 bottom-[var(--widget-viewport-bottom)] z-50 flex h-[min(42rem,86dvh,var(--widget-viewport-height))] flex-col [container-type:size] outline-none sm:inset-x-auto sm:right-4 sm:bottom-[max(var(--widget-viewport-bottom),calc(11rem+env(safe-area-inset-bottom)))] sm:h-[min(39rem,calc(100dvh-12rem),var(--widget-viewport-height))] sm:w-105"
          >
            <motion.div
              className="flex h-full min-h-0 flex-col overflow-hidden rounded-widget border border-border bg-background text-foreground shadow-xl"
              initial={reducedMotion ? false : { y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.17, ease: "easeOut" }}
            >
              <motion.div
                key={activeKind ?? (showInstructions ? "guide" : "menu")}
                className="flex min-h-0 flex-1 flex-col"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
              >
                <header
                  className={showingDetailResult ? "sr-only" : "shrink-0 px-3 pt-12 text-center sm:px-5 sm:pt-7"}
                >
                  <Dialog.Title
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-widget-title outline-none"
                  >
                    {activeKind ? `${checkLabels[activeKind]}${showingDetailResult ? "結果" : ""}` : "「這是詐騙嗎？」"}
                  </Dialog.Title>
                </header>
                {detailResult ? (
                  <motion.div
                    key={detailResult.submissionId}
                    ref={transcript}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.2 }}
                  >
                    {activeKind === "account" && <AccountCheckResult turn={detailResult} onCheck={openRelatedCheck} />}
                    {activeKind === "dialogue" && <DialogueCheckResult turn={detailResult} onCheck={openRelatedCheck} />}
                    {activeKind === "url" && (
                      <UrlCheckResult turn={detailResult} onCheck={openRelatedCheck} />
                    )}
                  </motion.div>
                ) : activeKind === "dialogue" ? (
                  <div className={`${checkBody} ${checkIntroSpacing} items-center px-5`}>
                    {coverImage}
                    <div className="shrink-0 space-y-3 text-center">
                      {pending ? (
                        <p role="status" className="text-widget-body text-black motion-safe:animate-bounce">努力讀取中…敬請稍候</p>
                      ) : (
                        <>
                          {error && <p role="alert" className="text-widget-note text-orange">{error}</p>}
                          <button type="button" className={`btn btn-yellow min-h-11 ${actionFocus}`} onClick={beginDialogueSelection}>重新選取對話</button>
                        </>
                      )}
                    </div>
                  </div>
                ) : showingChatHistory ? (
                  <div className="mx-auto flex min-h-0 w-full max-w-96 flex-1 flex-col gap-3 px-5 pt-5">
                    <QuickChatHistory
                      turns={activeTurns}
                      pending={pending}
                      transcriptRef={transcript}
                      onCheck={openRelatedCheck}
                    />
                    <form
                      className="shrink-0 space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submit("chat");
                      }}
                    >
                      {error && <p role="alert" className="text-widget-note text-orange">{error}</p>}
                      <CheckInput kind="chat" input={drafts.chat} pending={pending} compact onChange={setText} />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`btn btn-black min-h-11 ${actionFocus}`}
                          disabled={pending || (!hasInput && !error)}
                          onClick={() => {
                            resetInput("chat");
                            setErrors((current) => ({ ...current, chat: undefined }));
                          }}
                        >
                          重新輸入
                        </button>
                        <button type="submit" disabled={pendingKind !== null || !hasInput} className={`btn btn-yellow min-h-11 ${actionFocus}`}>
                          確定送出
                        </button>
                      </div>
                    </form>
                  </div>
                ) : activeKind ? (
                  <div
                    ref={transcript}
                    tabIndex={activeKind === "chat" ? 0 : undefined}
                    role={activeKind === "chat" ? "region" : undefined}
                    aria-label={activeKind === "chat" ? "快速對話內容" : undefined}
                    className={`${checkBody} ${checkIntroSpacing} ${activeKind === "chat" ? "scrollbar-none" : ""}`}
                  >
                    {showChatIntro ? (
                      <div className="my-auto flex shrink-0 flex-col gap-5 px-5">
                        {coverImage}
                        <p className="shrink-0 text-center text-widget-body whitespace-pre-line">{checkPrompts.chat}</p>
                      </div>
                    ) : coverImage}
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submit(activeKind);
                      }}
                      className="mx-auto w-full max-w-96 shrink-0 space-y-3 px-5"
                    >
                      {!showChatIntro && (
                        <p role={showCheckSpinner ? "status" : undefined} className="text-center text-widget-body whitespace-pre-line text-black">
                          {showCheckSpinner ? "努力查證中…敬請稍候" : checkPrompts[activeKind]}
                        </p>
                      )}
                      {error && (
                        <p role="alert" className="text-widget-note text-orange">
                          {error}
                        </p>
                      )}
                      <CheckInput
                        kind={activeKind}
                        input={drafts[activeKind]}
                        pending={pending}
                        urlErrorId={activeKind === "url" && invalidUrl ? urlErrorId : undefined}
                        onChange={(value) => {
                          if (activeKind === "url") setInvalidUrl(false);
                          setters[activeKind](value);
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`btn btn-black min-h-11 ${actionFocus} ${accountLoadingButtonStyle}`}
                          onClick={() => {
                            resetInput(activeKind);
                            if (activeKind === "url") setInvalidUrl(false);
                            setErrors((current) => ({
                              ...current,
                              [activeKind]: undefined,
                            }));
                          }}
                          disabled={pending || (!hasInput && !error)}
                        >
                          重新輸入
                        </button>
                        <button
                          type="submit"
                          className={`btn btn-yellow min-h-11 ${actionFocus} ${accountLoadingButtonStyle}`}
                          disabled={pendingKind !== null || !hasInput}
                        >
                          確定送出
                        </button>
                      </div>
                      {activeKind === "url" && invalidUrl && (
                        <p id={urlErrorId} role="alert" className="text-widget-note text-orange">
                          連結無效，請重新輸入！
                        </p>
                      )}
                    </form>
                  </div>
                ) : (
                  <div key={showInstructions ? "guide" : "menu"} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {coverImage}
                    {showInstructions ? (
                      <CheckGuide onHome={() => setShowInstructions(false)} />
                    ) : (
                      <CheckMenu onHelp={() => setShowInstructions(true)} onSelect={(kind) => {
                        if (kind === "dialogue" && pendingKind !== "dialogue") beginDialogueSelection();
                        else setActiveKind(kind);
                      }} />
                    )}
                  </div>
                )}
              </motion.div>
              <footer className="flex shrink-0 justify-end px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {activeKind ? (
                  <button
                    type="button"
                    aria-label="返回查證選單"
                    className={panelAction}
                    onClick={() => {
                      setDetailResultId(null);
                      setActiveKind(null);
                    }}
                  >
                    {showingDetailResult || showingChatHistory ? <IconHomeFilled aria-hidden size={23} /> : <IconChevronLeft aria-hidden size={23} stroke={2.3} />}
                  </button>
                ) : (
                  <Dialog.Close aria-label="關閉查證" className={panelAction}>
                    <IconX aria-hidden size={23} stroke={2.3} />
                  </Dialog.Close>
                )}
              </footer>
            </motion.div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
