export const scenarioVersion = "ticket-v1";
export const ticketSellerId = "weekend.stage";
export const ticketConversationId = "weekend-stage";
export const ticketConversationHref = `/messages/${ticketConversationId}`;
export const ticketReply = "轉好帳了";
export const messageIntervalMs = 1000;

export type ScriptMessage = {
  id: string;
  sender: "seller" | "buyer";
  text: string;
};

export const openingMessages: readonly ScriptMessage[] = [
  { id: "opening-1", sender: "seller", text: "嗨，你是問週六晚場那張票嗎？" },
  { id: "opening-2", sender: "buyer", text: "對，請問還有嗎？我想買。" },
  { id: "opening-3", sender: "seller", text: "還有，一張 2,400 元。轉帳資料在這裡：【模擬收款資料】。轉好跟我說，我再跟你確認交票。" },
];

export const followUpMessages: readonly ScriptMessage[] = [
  { id: "follow-up-1", sender: "seller", text: "我這邊顯示轉帳失敗，暫時沒辦法把票轉給你。" },
  { id: "follow-up-2", sender: "seller", text: "對方說這筆需要再做一次付款驗證。" },
  { id: "follow-up-3", sender: "seller", text: "你可以先付第二次嗎？他說前一筆之後會退回來。" },
  { id: "follow-up-4", sender: "seller", text: "他給我的付款驗證頁是 https://myship.payment-check.invalid/，你可以先看一下。" },
];
