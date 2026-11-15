import { saveAccount } from "@/app/admin/data-actions"
import type { AccountRecord } from "@/lib/admin/data"
import { TextField } from "./fields"
import { AdminForm } from "./form"

export function AccountEditor({ entry }: { entry?: AccountRecord }) {
  return (
    <section className="rounded-xl border p-4 sm:p-5">
      <h2 className="mb-4 text-lg font-semibold">{entry ? "編輯帳號" : "新增帳號"}</h2>
      <AdminForm action={saveAccount.bind(null, entry?.id ?? null)}>
        {entry ? (
          <p className="text-sm text-muted-foreground">Threads 帳號 ID　@{entry.id}</p>
        ) : (
          <TextField name="id" label="Threads 帳號 ID" required maxLength={60} spellCheck={false} autoCapitalize="none" />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="caseStatus" label="案件狀態" required maxLength={80} placeholder="例如 正在核實" defaultValue={entry?.case_status ?? ""} />
          <TextField name="lookupCount" label="查詢人數" required type="number" min={0} max={2147483647} step={1} defaultValue={entry?.lookup_count ?? ""} />
        </div>
        <TextField name="sourceUrl" label="資料連結" type="url" required maxLength={2048} defaultValue={entry?.source_url ?? ""} />
      </AdminForm>
    </section>
  )
}
