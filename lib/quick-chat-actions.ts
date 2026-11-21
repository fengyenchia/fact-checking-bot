import { quickChatTools, type ChatReplySegment, type SuggestedCheck } from "@/components/chatbot/types";

function socialAccountText(text: string) {
  return text
    .replace(/(?:銀行|收款|轉帳|匯款|金融|付款).{0,2}帳(?:號|戶)/g, "")
    .replace(/帳號(?:與|和|及|、)?密碼/g, "");
}

function mentionsTool(text: string, tool: SuggestedCheck) {
  if (tool === "url") return /連結|網址|網域|https?:\/\/|www\./i.test(text);
  if (tool === "account") {
    const accountText = socialAccountText(text);
    return /帳號|使用者名稱|用戶名稱/.test(accountText)
      && /查證|查詢|核對|確認|辨識|可疑|冒用|冒充|假帳號|通報|真偽|身分|身份/.test(accountText);
  }
  return /對話|訊息|話術|說詞|手法|付款要求/.test(text);
}

export function quickChatDisplaySegments(segments: readonly ChatReplySegment[], context?: string) {
  const storedActions = segments.every(({ actions }) => Array.isArray(actions));
  const accountContext = context === undefined || /帳號|使用者名稱|用戶名稱|(?:^|[\s（(「])@[a-z0-9._]+/i.test(socialAccountText(context));
  const actionsBySegment: SuggestedCheck[][] = segments.map(() => []);
  for (const tool of quickChatTools) {
    if (tool === "account" && !accountContext) continue;
    let index = storedActions
      ? segments.findIndex(({ actions, text }) => actions?.includes(tool) && (tool !== "account" || mentionsTool(text, tool)))
      : segments.findIndex(({ text }) => mentionsTool(text, tool));
    // An AI-selected account action alone is not evidence that this paragraph needs account lookup.
    if (!storedActions && index < 0 && tool !== "account") index = segments.findIndex(({ action }) => action === tool);
    if (index >= 0) actionsBySegment[index].push(tool);
  }
  return segments.map((segment, index) => ({
    ...segment,
    action: actionsBySegment[index][0] ?? null,
    actions: actionsBySegment[index],
  }));
}
