import type { ReactNode } from "react";
import { ThreadsNavigation } from "./navigation";

export function ThreadsShell({
  children,
  active,
}: {
  children: ReactNode;
  active: "home" | "messages";
}) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-white">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain">
        {children}
      </div>
      <ThreadsNavigation active={active} />
    </div>
  );
}
