import { MessageList } from "@/components/threads/message-list";
import { ThreadsShell } from "@/components/threads/shell";

export default function MessagesPage() {
  return <ThreadsShell active="messages"><MessageList /></ThreadsShell>;
}
