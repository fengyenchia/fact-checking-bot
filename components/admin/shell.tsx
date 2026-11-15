import type { ReactNode } from "react"
import Link from "next/link"
import { IconArchive, IconFiles, IconLogout, IconUsers } from "@tabler/icons-react"
import { logOut } from "@/app/admin/auth-actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const sections = [
  { href: "/admin", label: "測試紀錄", icon: IconArchive },
  { href: "/admin/cases", label: "官方案例", icon: IconFiles },
  { href: "/admin/accounts", label: "可疑帳號", icon: IconUsers },
] as const

export function AdminShell({ section, children }: {
  section: (typeof sections)[number]["href"]
  children: ReactNode
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 pb-12 sm:px-8">
      <header className="sticky top-0 z-30 mb-7 bg-background pt-6 sm:pt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">查證管理後台</h1>
          <form action={logOut} className="shrink-0">
            <Button type="submit" variant="outline" className="min-h-11 px-3">
              <IconLogout aria-hidden="true" />
              登出
            </Button>
          </form>
        </div>
        <nav aria-label="管理功能" className="flex gap-1 overflow-x-auto border-b">
          {sections.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={section === href ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-1 rounded-t-md border-b-2 px-2 text-sm font-medium whitespace-nowrap outline-offset-[-2px] hover:bg-muted focus-visible:outline-2 sm:gap-1.5 sm:px-4",
                section === href ? "border-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </main>
  )
}

export function AdminLoading() {
  return <p role="status" className="p-6 text-sm text-muted-foreground">讀取中…</p>
}

export function DatabaseNotice({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <p role="status" className="rounded-xl border bg-muted px-4 py-3 text-sm">
      {unavailable ? "無法讀取資料庫。請檢查 Neon 連線與資料表設定。" : "尚未連接 Neon。設定 DATABASE_URL 並執行資料庫初始化後，即可使用此功能。"}
    </p>
  )
}
