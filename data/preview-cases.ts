import type { CaseCardData } from "@/components/case-card";

const sourceName = "165 打詐儀錶板";
const sourceUrl = "https://165dashboard.tw/city-case-summary";

// These demo cards summarize the first three cases in the spreadsheet.
export const previewCases: CaseCardData[] = [
  {
    id: "preview-ticket-transfer-note",
    title: "購票後稱備註錯誤",
    summary: "匯款買票後被指備註錯誤，假客服誘導設定無卡提款，帳戶資金遭提領。",
    sourceName,
    sourceUrl,
  },
  {
    id: "preview-ticket-frozen-payment",
    title: "款項凍結要求補匯",
    summary: "買家首次匯款後，賣家稱款項遭凍結，要求再匯一筆才能解鎖。",
    sourceName,
    sourceUrl,
  },
  {
    id: "preview-ticket-fake-transfer",
    title: "假官方轉票騙補匯",
    summary: "賣家假稱官方轉票，以備註有誤為由，要求提供帳戶資料並補匯。",
    sourceName,
    sourceUrl,
  },
];
