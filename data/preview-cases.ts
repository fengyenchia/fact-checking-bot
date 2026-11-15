import type { CaseCardData } from "@/components/case-card";

const sourceName = "165 打詐儀錶板";
const sourceUrl = "https://165dashboard.tw/city-case-summary";

// Keep the local preview in sync with the first three rows of the case spreadsheet.
export const previewCases: CaseCardData[] = [
  {
    id: "preview-ticket-transfer-note",
    title: "Threads 購票後被指轉帳備註錯誤",
    summary: "買家在 Threads 找讓票，匯款後被告知備註錯誤、款項卡住。假客服聲稱要先認證才能退款，誘導買家設定無卡提款，帳戶資金隨後遭提領。",
    sourceName,
    sourceUrl,
  },
  {
    id: "preview-ticket-frozen-payment",
    title: "門票轉讓稱資金凍結，要求再次匯款",
    summary: "買家透過 Threads 洽購門票，首次匯款後，賣家稱款項凍結，必須再匯一筆才能解鎖。買家準備第二次匯款時察覺異常。",
    sourceName,
    sourceUrl,
  },
  {
    id: "preview-ticket-fake-transfer",
    title: "假官方轉票以備註錯誤要求補匯",
    summary: "賣家聲稱透過官方系統轉票，收款後說轉帳備註有誤。對方提供的客服連結又要求交付帳戶資料，並以事後退款為由要求再匯款。",
    sourceName,
    sourceUrl,
  },
];
