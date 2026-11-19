"use client";

import Link from "next/link";
import {
  IconArrowUp,
  IconChevronLeft,
  IconDotsCircleHorizontal,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import { Button } from "@/components/ui/button";
import {
  followUpMessages,
  messageIntervalMs,
  openingMessages,
  scenarioVersion,
  ticketReply,
  ticketSellerId,
  ticketSellerName,
  type ScriptMessage,
} from "@/data/scenarios/ticket";
import { Avatar } from "./avatar";
import { ConversationMessage } from "./conversation-message";

type Session = { id: string; sentAt: number | null };

const storageKey = `threads-scenario:${scenarioVersion}`;
const sentMessage: ScriptMessage = {
  id: "buyer-payment",
  sender: "buyer",
  text: ticketReply,
};

function createSession(): Session {
  return { id: crypto.randomUUID(), sentAt: null };
}

function restoreSession(): Session {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const saved: Session = JSON.parse(raw);
      if (
        typeof saved?.id === "string" &&
        (saved.sentAt === null || Number.isFinite(saved.sentAt))
      )
        return saved;
    }
  } catch {
    // The mock conversation can run without browser storage.
  }
  return createSession();
}

function rememberSession(session: Session) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // The current session still works until navigation.
  }
}

export function Conversation({ canRestart }: { canRestart: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [followUpsShown, setFollowUpsShown] = useState(0);
  const [dialogueSelecting, setDialogueSelecting] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const tail = useRef<HTMLDivElement>(null);
  const sentAt = session?.sentAt;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const initial = restoreSession();
      rememberSession(initial);
      setSession(initial);
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (sentAt == null) return;
    let handle: number;
    function sync() {
      if (sentAt == null) return;
      const elapsed = Math.max(0, Date.now() - sentAt);
      const visible = Math.min(
        followUpMessages.length,
        Math.floor(elapsed / messageIntervalMs),
      );
      setFollowUpsShown(visible);
      if (visible < followUpMessages.length) {
        handle = window.setTimeout(
          sync,
          messageIntervalMs - (elapsed % messageIntervalMs),
        );
      }
    }
    handle = window.setTimeout(sync, 0);
    return () => window.clearTimeout(handle);
  }, [sentAt]);

  useEffect(() => {
    if (sentAt != null && !dialogueSelecting)
      tail.current?.scrollIntoView({ block: "end" });
  }, [sentAt, followUpsShown, dialogueSelecting]);

  const messages =
    sentAt == null
      ? openingMessages
      : [
          ...openingMessages,
          sentMessage,
          ...followUpMessages.slice(0, followUpsShown),
        ];
  const sellerMessages = messages.filter(({ sender }) => sender === "seller");

  function send() {
    if (!session || session.sentAt !== null) return;
    const next = { ...session, sentAt: Date.now() };
    rememberSession(next);
    setSession(next);
  }

  function restart() {
    const next = createSession();
    rememberSession(next);
    setDialogueSelecting(false);
    setSelectedMessageIds([]);
    setFollowUpsShown(0);
    setSession(next);
  }

  return (
    <main className="relative flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] min-h-0 flex-col">
      {dialogueSelecting && <div aria-hidden="true" className="fixed inset-0 z-30 bg-black/40" />}
      <header inert={dialogueSelecting} className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-2 pt-[env(safe-area-inset-top)] sm:px-4">
        <Link
          href="/messages"
          aria-label="返回訊息列表"
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-neutral-100"
        >
          <IconChevronLeft className="size-5" />
        </Link>
        <Avatar className="size-9" />
        <div className="mr-auto min-w-0 py-2">
          <h1 className="truncate text-[15px] font-semibold">{ticketSellerName}</h1>
          <p className="truncate text-xs text-neutral-500">@{ticketSellerId}</p>
        </div>
        {canRestart && session && (
          <Button
            variant="ghost"
            className="h-10 shrink-0 px-2 text-xs text-neutral-600"
            onClick={restart}
          >
            重新開始
          </Button>
        )}
        <span aria-hidden className="grid size-10 shrink-0 place-items-center">
          <IconDotsCircleHorizontal className="size-5" />
        </span>
      </header>
      <div className={`min-h-0 flex-1 px-3.5 sm:px-5 ${dialogueSelecting ? "relative z-40 flex flex-col py-3" : "overflow-y-auto overscroll-y-contain pb-24"}`}>
        {!dialogueSelecting && (
          <div className="py-7 text-center">
            <Avatar className="mx-auto mb-2 size-16" />
            <p className="text-[18px] font-semibold">{ticketSellerName}</p>
            <p className="text-sm text-neutral-500">@{ticketSellerId}</p>
          </div>
        )}
        <ol
          className={`space-y-2.5 ${dialogueSelecting ? "min-h-0 overflow-y-auto overscroll-y-contain rounded-widget bg-white p-3" : ""}`}
          aria-label="對話訊息"
          aria-describedby={dialogueSelecting ? "dialogue-selection-hint" : undefined}
        >
          {messages.map((message) => (
            <ConversationMessage
              key={message.id}
              message={message}
              selecting={dialogueSelecting}
              selected={selectedMessageIds.includes(message.id)}
              toggle={() =>
                setSelectedMessageIds((current) =>
                  current.includes(message.id)
                    ? current.filter((id) => id !== message.id)
                    : [...current, message.id],
                )
              }
            />
          ))}
        </ol>
        {dialogueSelecting && (
          <p id="dialogue-selection-hint" className="widget-font text-widget-body mt-2 shrink-0 self-center rounded-widget bg-yellow3 px-4 py-1 text-black">
            點選以選取對話
          </p>
        )}
        <div ref={tail} />
      </div>
      <form
        className={dialogueSelecting ? "hidden" : "flex shrink-0 items-center gap-2 bg-white px-3 py-2 sm:px-5"}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-400"
        >
          <IconPlus className="size-5" />
        </span>
        <input
          aria-label="訊息"
          readOnly
          value={sentAt == null ? ticketReply : ""}
          placeholder="訊息……"
          className="h-11 w-full min-w-0 rounded-full bg-neutral-100 px-4 text-[15px]"
        />
        {sentAt == null && (
          <Button
            type="submit"
            size="icon"
            aria-label="送出轉好帳了"
            disabled={!session || dialogueSelecting}
            className="size-11 shrink-0 rounded-full"
          >
            <IconArrowUp />
          </Button>
        )}
      </form>
      {session && (
        <ChatbotWidget
          key={session.id}
          sessionId={session.id}
          scriptVersion={scenarioVersion}
          messages={sellerMessages}
          dialogueSelecting={dialogueSelecting}
          onDialogueSelectingChange={setDialogueSelecting}
          selectedMessageIds={selectedMessageIds}
          onSelectedMessageIdsChange={setSelectedMessageIds}
        />
      )}
    </main>
  );
}
