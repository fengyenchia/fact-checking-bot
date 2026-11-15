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
    <div className="min-h-dvh w-full bg-white pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      {children}
      <ThreadsNavigation active={active} />
    </div>
  );
}
