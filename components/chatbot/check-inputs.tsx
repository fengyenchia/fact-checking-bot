"use client";

import { Tabs } from "@base-ui/react/tabs";
import { IconLink, IconMessageCircle, IconUser } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

import { checkLabels, type CheckTab } from "./types";

const tabs = [
  { value: "dialogue", Icon: IconMessageCircle },
  { value: "url", Icon: IconLink },
  { value: "account", Icon: IconUser },
] as const;

const inputClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function CheckInputs({
  activeTab,
  setActiveTab,
  selectedCount,
  beginDialogueSelection,
  url,
  setUrl,
  accountId,
  setAccountId,
  pending,
}: {
  activeTab: CheckTab | null;
  setActiveTab: (tab: CheckTab | null) => void;
  selectedCount: number;
  beginDialogueSelection: () => void;
  url: string;
  setUrl: (value: string) => void;
  accountId: string;
  setAccountId: (value: string) => void;
  pending: boolean;
}) {
  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as CheckTab | null)}
    >
      <Tabs.List
        aria-label="查證方式"
        className="grid grid-cols-3 gap-1 border-b border-border px-3 py-2"
      >
        {tabs.map(({ value, Icon }) => (
          <Tabs.Tab
            key={value}
            value={value}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-1 text-xs font-semibold whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-[active]:bg-muted data-[active]:text-foreground sm:text-sm"
          >
            <Icon aria-hidden className="size-4 shrink-0" stroke={1.9} />
            {checkLabels[value]}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value="dialogue" className="border-b border-border px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl"
          onClick={beginDialogueSelection}
          disabled={pending}
        >
          <IconMessageCircle aria-hidden />
          {selectedCount ? `編輯已選取的 ${selectedCount} 則訊息` : "選取賣家的訊息"}
        </Button>
      </Tabs.Panel>
      <Tabs.Panel value="url" className="border-b border-border px-4 py-3">
        <label className="block text-sm font-medium text-foreground">
          網址
          <input
            className={inputClassName}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={1000}
            placeholder="貼上要查證的網址"
            disabled={pending}
          />
        </label>
      </Tabs.Panel>
      <Tabs.Panel value="account" className="border-b border-border px-4 py-3">
        <label className="block text-sm font-medium text-foreground">
          Threads 帳號
          <input
            className={inputClassName}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={100}
            placeholder="@username"
            disabled={pending}
          />
        </label>
      </Tabs.Panel>
    </Tabs.Root>
  );
}
