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
export type SuggestedCheck = "url" | "account";
export type ChatAction = SuggestedCheck | "report";
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
  if (result.urlEvidence === "twnic") return "有通報紀錄";
  if (result.verdict === "official") return "安全";
  if (result.verdict === "risk") return "有問題喔";
  return "無法確認";
}

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
  cases: CaseCardData[];
  aiStatus?: "completed" | "unavailable" | "local";
  reportUrl: string | null;
};

export type WidgetTurn = {
  submissionId: string;
  input: WidgetInput;
  response: WidgetResponse;
};
