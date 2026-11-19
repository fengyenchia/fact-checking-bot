import { IconHome, IconInfoCircle } from "@tabler/icons-react";
import { QuickChatLoading } from "./quick-chat";

import { checkLabels, type CheckKind, type WidgetInput } from "./types";

const checkOrder = ["url", "dialogue", "account", "chat"] as const;
const actionFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const fieldStyle =
  "w-full rounded-widget border border-input bg-background px-4 py-2.5 text-widget-body placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring";
const menuLink = `mx-auto flex w-fit cursor-pointer items-center gap-1 rounded-widget text-widget-note underline underline-offset-4 active:bg-yellow3 active:text-black ${actionFocus}`;

export function CheckMenu({
  onSelect,
  onHelp,
}: {
  onSelect: (kind: CheckKind) => void;
  onHelp: () => void;
}) {
  return (
    <div className="mx-auto my-auto flex w-full max-w-64 shrink-0 flex-col gap-5 px-5 py-4 text-center">
      <p className="text-widget-body">
        別慌別慌！
        <br />
        讓我們快速開始...
      </p>
      <div className="grid gap-2.5">
        {checkOrder.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`btn btn-yellow min-h-11 ${actionFocus}`}
            onClick={() => onSelect(kind)}
          >
            {checkLabels[kind]}
          </button>
        ))}
      </div>
      <button type="button" className={menuLink} onClick={onHelp}>
        <IconInfoCircle aria-hidden size={15} />
        如何使用？
      </button>
    </div>
  );
}

export function CheckGuide({ onHome }: { onHome: () => void }) {
  return (
    <div className="mx-auto w-full max-w-72 shrink-0 px-5 py-4">
      <section
        aria-labelledby="widget-guide-title"
        className="space-y-3 rounded-widget border border-black3 px-4 py-4"
      >
        <h2 id="widget-guide-title" className="text-widget-body font-semibold">
          <span className="bg-linear-to-t from-yellow3 from-40% to-transparent to-40%">
            我是快速查核小工具！
          </span>
        </h2>
        <p className="text-widget-body">
          透過四種簡易方式，結合政府官方的通報數據，幫助使用者快速辨認社群詐騙並通報。
          <br />
          一起將詐騙一網打盡吧！
        </p>
        <ul className="list-disc space-y-1 pl-5 text-widget-note">
          {checkOrder.map((kind) => (
            <li key={kind}>
              {checkLabels[kind]}：說明說明～
            </li>
          ))}
        </ul>
      </section>
      <button type="button" className={`${menuLink} mt-1 min-h-11`} onClick={onHome}>
        <IconHome aria-hidden size={16} />
        回首頁
      </button>
    </div>
  );
}

export function CheckInput({
  kind,
  input,
  pending,
  compact = false,
  urlErrorId,
  onChange,
}: {
  kind: Exclude<CheckKind, "dialogue">;
  input: WidgetInput;
  pending: boolean;
  compact?: boolean;
  urlErrorId?: string;
  onChange: (value: string) => void;
}) {
  if (kind === "chat") {
    const value = input.text ?? "";
    const chatFieldStyle = `${fieldStyle} wrap-anywhere whitespace-pre-wrap`;

    return (
      <div className="relative min-w-0 flex-1">
        <div
          aria-hidden="true"
          className={`${chatFieldStyle} invisible overflow-hidden ${compact ? "max-h-24" : "max-h-[clamp(3rem,calc(100cqh-16rem),26rem)]"} ${pending && !compact ? "min-h-44" : ""}`}
        >
          {value}{"\u200b"}
        </div>
        <textarea
          rows={1}
          aria-label="快速對話問題"
          placeholder="發生什麼了？"
          maxLength={1000}
          className={`${chatFieldStyle} absolute inset-0 h-full resize-none overflow-y-auto scrollbar-none`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={pending}
        />
        {pending && !compact && <QuickChatLoading />}
      </div>
    );
  }

  const isUrl = kind === "url";
  return (
    <input
      aria-label={isUrl ? "網址" : "Threads 帳號"}
      aria-invalid={isUrl && urlErrorId ? true : undefined}
      aria-describedby={isUrl ? urlErrorId : undefined}
      className={fieldStyle}
      value={isUrl ? (input.url ?? "") : (input.accountId ?? "")}
      onChange={(event) => onChange(event.target.value)}
      type="text"
      inputMode={isUrl ? "url" : "text"}
      autoComplete="off"
      autoCapitalize="none"
      spellCheck={false}
      maxLength={isUrl ? 1000 : 100}
      placeholder={isUrl ? "輸入連結..." : "@username"}
      disabled={pending}
    />
  );
}
