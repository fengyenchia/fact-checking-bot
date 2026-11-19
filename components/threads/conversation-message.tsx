import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import type { ScriptMessage } from "@/data/scenarios/ticket";
import { Avatar } from "./avatar";

const demoLink = "https://myship.payment-check.invalid/";

export function ConversationMessage({
  message,
  selecting,
  selected,
  toggle,
}: {
  message: ScriptMessage;
  selecting: boolean;
  selected: boolean;
  toggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const seller = message.sender === "seller";
  const bubbleClass = `max-w-[82%] rounded-[20px] px-3.5 py-2 text-left text-[15px] leading-snug wrap-anywhere ${seller ? "bg-neutral-100 text-neutral-900" : "bg-neutral-950 text-white"}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(demoLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className={`flex items-end gap-2 ${seller ? "" : "justify-end"}`}>
      {seller && <Avatar className="mb-0.5 size-6" />}
      {selecting && seller ? (
        <button
          type="button"
          aria-pressed={selected}
          onClick={toggle}
          className={`${bubbleClass} flex min-h-11 cursor-pointer items-center gap-2 border ${selected ? "border-black" : "border-transparent"}`}
        >
          <span
            aria-hidden
            className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected ? "border-black bg-black text-white" : "border-neutral-400"}`}
          >
            {selected && <IconCheck className="size-3.5" />}
          </span>
          {message.text}
        </button>
      ) : (
        <div className={bubbleClass}>
          <p className={seller ? "select-text" : undefined}>{message.text}</p>
          {seller && message.text.includes(demoLink) && !selecting && (
            <button
              type="button"
              className="mt-1 flex min-h-8 cursor-pointer items-center gap-1 rounded-md text-xs font-medium text-neutral-700"
              onClick={copyLink}
            >
              <IconCopy aria-hidden className="size-3.5" />
              {copied ? "已複製網址" : "複製網址"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
