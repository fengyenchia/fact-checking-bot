import Link from "next/link"
import { Suspense } from "react"
import { TextField } from "@/components/admin/fields"
import { AdminLoading, AdminShell, DatabaseNotice } from "@/components/admin/shell"
import { SubmissionRecord } from "@/components/admin/submission-record"
import { Button, buttonVariants } from "@/components/ui/button"
import { readSubmissions } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/admin/session"

type Query = Promise<{ session?: string | string[]; page?: string | string[] }>

async function SubmissionsContent({ searchParams }: { searchParams: Query }) {
  const query = await searchParams
  const session = typeof query.session === "string" ? query.session.trim().slice(0, 100) : ""
  const page = typeof query.page === "string"
    ? Math.min(100_000, Math.max(1, Math.floor(Number(query.page) || 1)))
    : 1
  const data = await readSubmissions(session, page).catch(() => undefined)
  if (!data) return <DatabaseNotice unavailable={data === undefined} />

  const href = (target: number) => `/admin?${new URLSearchParams({ session, page: String(target) })}`

  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold">測試紀錄</h2>
      <form className="flex flex-wrap items-end gap-2" method="get" action="/admin">
        <div className="min-w-0 flex-1">
          <TextField name="session" label="依場次 ID 篩選" placeholder="全部場次" list="test-sessions" defaultValue={session} maxLength={100} />
          <datalist id="test-sessions">
            {data.sessions.map((id) => <option key={id} value={id} />)}
          </datalist>
        </div>
        <Button type="submit" variant="outline" className="min-h-11 px-4">篩選</Button>
        {session && <Link className={buttonVariants({ variant: "ghost", className: "min-h-11 px-4" })} href="/admin">清除</Link>}
      </form>
      <div className="space-y-2">
        {data.records.map((record) => <SubmissionRecord key={`${record.session_id}/${record.submission_id}`} record={record} />)}
        {!data.records.length && <p className="rounded-xl border px-4 py-5 text-sm text-muted-foreground">此範圍沒有測試紀錄。</p>}
      </div>
      {(page > 1 || data.more) && (
        <nav aria-label="測試紀錄分頁" className="flex items-center gap-3 text-sm">
          {page > 1 && <Link className={buttonVariants({ variant: "outline", className: "min-h-11 px-4" })} href={href(page - 1)}>上一頁</Link>}
          <span>第 {page} 頁</span>
          {data.more && <Link className={buttonVariants({ variant: "outline", className: "min-h-11 px-4" })} href={href(page + 1)}>下一頁</Link>}
        </nav>
      )}
    </section>
  )
}

async function ProtectedSubmissions({ searchParams }: { searchParams: Query }) {
  await requireAdmin()
  return <AdminShell section="/admin"><SubmissionsContent searchParams={searchParams} /></AdminShell>
}

export default function AdminPage({ searchParams }: { searchParams: Query }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProtectedSubmissions searchParams={searchParams} />
    </Suspense>
  )
}
