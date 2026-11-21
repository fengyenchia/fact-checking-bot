import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Conversation } from "@/components/threads/conversation";
import { ThreadsShell } from "@/components/threads/shell";
import { ticketConversationId } from "@/data/scenarios/ticket";

export function generateStaticParams() {
  return [{ conversationId: ticketConversationId }];
}

type ConversationParams = Promise<{ conversationId: string }>;

async function ConversationContent({ params }: { params: ConversationParams }) {
  const { conversationId } = await params;
  if (conversationId !== ticketConversationId) notFound();
  return <Conversation />;
}

export default function ConversationPage({
  params,
}: {
  params: ConversationParams;
}) {
  return (
    <ThreadsShell active="messages">
      <Suspense
        fallback={
          <p role="status" className="p-4 text-sm text-neutral-500">
            載入聊天室…
          </p>
        }
      >
        <ConversationContent params={params} />
      </Suspense>
    </ThreadsShell>
  );
}
