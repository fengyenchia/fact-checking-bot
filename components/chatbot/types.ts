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
export type CheckResult = {
  status: "completed" | "failed";
  verdict?: "risk" | "unknown" | "official" | "caution";
  highlights?: string[];
  summary: string;
  host?: string;
  domain?: string | null;
  subdomain?: string | null;
  sourceUrl?: string;
  urlEvidence?: "official-list" | "twnic" | "brand" | "web-search";
  sourceName?: string;
  accountDetails?: {
    lookupCount: number | null;
    caseStatus: string | null;
  };
};

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
