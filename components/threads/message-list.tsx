import Link from "next/link";
import { IconEdit, IconSearch } from "@tabler/icons-react";
import { openingMessages, ticketConversationHref, ticketSellerId } from "@/data/scenarios/ticket";
import { Avatar } from "./avatar";

export function MessageList() {
  return (
    <main className="px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-7">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-[25px] font-semibold tracking-tight">訊息</h1>
        <Link href={ticketConversationHref} aria-label="新訊息" className="grid size-11 place-items-center rounded-full hover:bg-neutral-100"><IconEdit className="size-6" /></Link>
      </header>
      <div aria-hidden className="flex h-11 items-center gap-3 rounded-full bg-neutral-100 px-4 text-[15px] text-neutral-500"><IconSearch className="size-5" />搜尋</div>
      <div className="mt-4 flex gap-2 text-[14px] font-semibold">
        <span className="rounded-full border border-neutral-200 bg-neutral-100 px-4 py-1.5">收件匣</span>
        <span className="rounded-full border border-neutral-200 px-4 py-1.5 text-neutral-500">陌生訊息</span>
      </div>
      <Link href={ticketConversationHref} className="-mx-2 mt-5 flex min-w-0 items-center gap-3 rounded-2xl p-2 hover:bg-neutral-50">
        <Avatar className="size-12" />
        <div className="min-w-0">
          <div className="font-semibold">{ticketSellerId}</div>
          <p className="truncate text-sm text-neutral-500">{openingMessages[0].text}</p>
        </div>
      </Link>
    </main>
  );
}
