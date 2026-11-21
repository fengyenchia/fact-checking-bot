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
    <div className="mx-auto flex min-h-0 w-full max-w-64 flex-1 flex-col gap-5 px-5 pt-4 text-center">
      <p className="text-widget-body shrink-0">
        別慌別慌！
        <br />
        野原星之助來了☆ミ
      </p>
      <div
        role="region"
        aria-label="查證功能選單"
        tabIndex={0}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none rounded-widget ${actionFocus}`}
      >
        <div className="grid gap-2.5 pb-1">
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
        <button type="button" className={`${menuLink} mt-5 mb-1 min-h-11`} onClick={onHelp}>
          <IconInfoCircle aria-hidden size={15} />
          如何使用？
        </button>
      </div>
    </div>
  );
}

export function CheckGuide({ onHome }: { onHome: () => void }) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-72 flex-1 flex-col px-5 pt-4">
      <section
        aria-labelledby="widget-guide-title"
        className="flex min-h-0 flex-1 flex-col rounded-widget border border-black3 p-4"
      >
        <div
          role="region"
          aria-label="查證工具使用說明"
          tabIndex={0}
          className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scrollbar-none ${actionFocus}`}
        >
          <h2 id="widget-guide-title" className="text-widget-body font-semibold text-center">
            <span className="bg-linear-to-t from-yellow3 from-40% to-transparent to-40%">
              我是野原星之助！
            </span>
          </h2>
          <p className="text-widget-body">
            透過四種簡易方式，結合政府官方的通報數據，幫助使用者快速辨認社群詐騙並通報。
            <br />
            一起將詐騙一網打盡吧！
          </p>
          <ul className="list-disc space-y-2 pl-5 text-widget-note">
            <li className="leading-5"><strong>連結查證：</strong>將使用者提供的連結與官方通報紀錄以及內建資料庫比對，判斷是否能安全打開該連結，以及是否需要通報。使用路徑：【首頁】{'>'}【連結查證】{'>'}【貼上連結】</li>
            <li className="leading-5"><strong>對話評估：</strong>使用者可以直接於聊天室內勾選可疑訊息並交由 AI 分析該對話是否包含常見詐騙手法。使用路徑：【首頁】{'>'}【對話評估】{'>'}【選取對話】</li>
            <li className="leading-5"><strong>帳號查證：</strong>比對已收錄的可疑 Threads 帳號，查看是否有通報紀錄。使用路徑：【首頁】{'>'}【帳號查證】{'>'}【輸入帳號 ID】</li>
            <li className="leading-5"><strong>快速對話：</strong>若不確定從何開始查證，可以以自然語言的方式，與聊天機器人直接對話並獲得後續行動建議。使用路徑：【首頁】{'>'}【快速對話】{'>'}【輸入事件描述】</li>
          </ul>
        </div>
      </section>
      <button
        type="button"
        className={`${menuLink} mt-1 min-h-11 shrink-0`}
        onClick={onHome}
      >
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
          {value}
          {"\u200b"}
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
      placeholder={isUrl ? "輸入連結..." : "輸入帳號 ID ..."}
      disabled={pending}
    />
  );
}
