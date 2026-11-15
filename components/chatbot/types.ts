import type { CaseCardData } from "@/components/case-card";

export const checkLabels = {
  dialogue: "對話風險",
  url: "連結查證",
  account: "帳號查證",
  chat: "小客服",
} as const;

export type CheckKind = keyof typeof checkLabels;
export type CheckTab = Exclude<CheckKind, "chat">;
export type CheckResult = {
  status: "completed" | "failed";
  summary: string;
  host?: string;
  domain?: string | null;
  subdomain?: string | null;
  sourceUrl?: string;
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
  cases: CaseCardData[];
  aiStatus?: "completed" | "unavailable" | "local";
  reportUrl: string | null;
};

export type WidgetTurn = {
  submissionId: string;
  input: WidgetInput;
  response: WidgetResponse;
};
