import type { CaseCardData } from "@/components/case-card";

export const digiatReportUrl = "https://fraudbuster.digiat.org.tw/accessibility/";

export const checkLabels = {
  url: "連結查證",
  dialogue: "對話評估",
  account: "帳號查證",
  chat: "快速對話",
} as const;

export const checkImageUrls = {
  url: "/pictures/covers/url.png",
  dialogue: "/pictures/covers/dialogue.png",
  account: "/pictures/covers/account.png",
  chat: "/pictures/covers/chat.png",
} as const;

export type CheckKind = keyof typeof checkLabels;
export const quickChatTools = ["url", "account", "dialogue"] as const;
export type SuggestedCheck = typeof quickChatTools[number];
// report is retained only to read previously saved replies.
export type ChatAction = SuggestedCheck | "report";
export type ChatReplySegment = { text: string; action: ChatAction | null; actions?: SuggestedCheck[] };
export type DialogueRiskLevel = "high" | "potential" | "insufficient";
export const dialogueRiskLabels: Record<DialogueRiskLevel, string> = {
  high: "極高風險",
  potential: "潛在風險",
  insufficient: "線索不足",
};
export type CheckResult = {
  status: "completed" | "failed";
  verdict?: "risk" | "unknown" | "official" | "caution";
  highlights?: string[];
  urlAnalysisStatus?: "completed" | "unavailable" | "local";
  caseSelection?: {
    caseIds: string[];
    retrievalStatus: "completed" | "unavailable";
  };
  dialogueAssessment?: {
    riskLevel: DialogueRiskLevel;
    evidence: { messageIndex: number; quote: string; reason: string }[];
    caseIds: string[];
    retrievalStatus: "completed" | "unavailable";
  };
  summary: string;
  host?: string;
  domain?: string | null;
  subdomain?: string | null;
  sourceUrl?: string;
  urlEvidence?: "official-list" | "twnic" | "brand";
  sourceName?: string;
  accountDetails?: {
    lookupCount: number | null;
    caseStatus: string | null;
  };
};

export function urlResultLabel(result: CheckResult) {
  if (result.urlEvidence === "twnic") return "曾被通報";
  if (result.verdict === "official") return "暫無疑慮";
  if (result.verdict === "risk") return "存在疑慮";
  return "無法確定";
}

export const unknownUrlFallback = {
  highlight: "來源仍待確認",
  summary: "尚無法確認來源，請勿輸入付款資料。",
} as const;

export type WidgetInput = {
  text?: string;
  messageIds?: string[];
  url?: string;
  accountId?: string;
};

export type WidgetResponse = {
  results: Partial<Record<CheckKind, CheckResult>>;
  explanation: string | null;
  suggestedActions?: ChatAction[];
  chatSegments?: ChatReplySegment[];
  cases: CaseCardData[];
  aiStatus?: "completed" | "unavailable" | "local";
};

export type WidgetTurn = {
  submissionId: string;
  input: WidgetInput;
  response: WidgetResponse;
};
