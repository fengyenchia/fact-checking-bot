import { quickChatDisplaySegments } from "@/lib/quick-chat-actions";
import { checkLabels, quickChatTools, type SuggestedCheck, type WidgetResponse } from "./types";

const actionClass = "btn btn-yellow min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function QuickChatAction({ action, onCheck }: { action: SuggestedCheck; onCheck: (kind: SuggestedCheck) => void }) {
  return (
    <button type="button" className={actionClass} onClick={() => onCheck(action)}>前往{checkLabels[action]}</button>
  );
}

export function QuickChatReply({ response, onCheck }: { response: WidgetResponse; onCheck: (kind: SuggestedCheck) => void }) {
  if (response.chatSegments?.length) {
    return (
      <div className="space-y-4">
        {quickChatDisplaySegments(response.chatSegments).map(({ text, actions }, index) => (
          <div key={index} className="space-y-2">
            <p className="text-widget-body wrap-anywhere">{text}</p>
            {actions.length > 0 && <div className="flex flex-wrap gap-2">{actions.map((action) => <QuickChatAction key={action} action={action} onCheck={onCheck} />)}</div>}
          </div>
        ))}
      </div>
    );
  }

  // Stored replies from before segmented output remain readable without a migration.
  const error = response.results.chat?.status === "failed"
    ? response.results.chat.summary
    : response.aiStatus === "unavailable" ? "小客服暫時無法回覆，請稍後重試。" : null;
  const legacyActions = response.suggestedActions?.filter((action): action is SuggestedCheck => quickChatTools.some((tool) => tool === action)) ?? [];
  return (
    <>
      {error && <p role="alert" className="text-widget-note text-orange">{error}</p>}
      {response.explanation && <p className="text-widget-body whitespace-pre-wrap wrap-anywhere">{response.explanation}</p>}
      {legacyActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {legacyActions.map((action) => <QuickChatAction key={action} action={action} onCheck={onCheck} />)}
        </div>
      )}
    </>
  );
}
