import Link from "next/link";
import {
  IconHeart,
  IconHome,
  IconHomeFilled,
  IconPlus,
  IconSend2,
  IconUser,
} from "@tabler/icons-react";

const iconClass = "size-6";

export function ThreadsNavigation({ active }: { active: "home" | "messages" }) {
  return (
    <nav
      aria-label="主要導覽"
      className="relative z-20 grid w-full shrink-0 grid-cols-5 items-center border-t border-neutral-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <Link
        href="/"
        aria-label="首頁"
        aria-current={active === "home" ? "page" : undefined}
        className={`grid h-14 place-items-center rounded-xl ${active === "home" ? "text-black" : "text-neutral-500"}`}
      >
        {active === "home" ? (
          <IconHomeFilled className={iconClass} />
        ) : (
          <IconHome className={iconClass} />
        )}
      </Link>
      <Link
        href="/messages"
        aria-label="訊息"
        aria-current={active === "messages" ? "page" : undefined}
        className={`grid h-14 place-items-center rounded-xl ${active === "messages" ? "text-black" : "text-neutral-500"}`}
      >
        <IconSend2
          className={iconClass}
          fill={active === "messages" ? "currentColor" : "none"}
        />
      </Link>
      <span
        aria-hidden
        className="mx-auto grid h-10 w-full max-w-16 place-items-center rounded-xl bg-neutral-100 text-neutral-400"
      >
        <IconPlus className={iconClass} />
      </span>
      <span
        aria-hidden
        className="grid h-14 place-items-center text-neutral-400"
      >
        <IconHeart className={iconClass} />
      </span>
      <span
        aria-hidden
        className="grid h-14 place-items-center text-neutral-400"
      >
        <IconUser className={iconClass} />
      </span>
    </nav>
  );
}
