import { saveCase } from "@/app/admin/data-actions"
import type { CaseRecord } from "@/lib/admin/data"
import { TextAreaField, TextField } from "./fields"
import { AdminForm } from "./form"

export function CaseEditor({ entry }: { entry?: CaseRecord }) {
  return (
    <section className="rounded-xl border p-4 sm:py-5">
      <h2 className="mb-4 text-lg font-semibold">{entry ? "編輯案例" : "新增案例"}</h2>
      <AdminForm action={saveCase.bind(null, entry?.id ?? null)}>
        {entry && <p className="text-sm text-muted-foreground">標題（AI）　{entry.title}</p>}
        <TextField name="productType" label="商品類別" required maxLength={80} defaultValue={entry?.product_type} />
        <TextAreaField name="summary" label="案例原文" required maxLength={3000} defaultValue={entry?.summary} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="sourceName" label="來源機關" required maxLength={120} defaultValue={entry?.source_name ?? "165 打詐儀錶板"} />
          <TextField name="sourceUrl" label="來源網址" required type="url" maxLength={2048} defaultValue={entry?.source_url ?? "https://165dashboard.tw/city-case-summary"} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="sourceDate" label="發布日期" required maxLength={10} placeholder="115-11-12" defaultValue={entry?.source_date} />
          <TextField name="sourceCity" label="發布縣市" required maxLength={20} placeholder="臺北市" defaultValue={entry?.source_city} />
        </div>
        {entry?.method_tags.length ? <p className="text-sm text-muted-foreground">手法標籤：{entry.method_tags.join("、")}</p> : null}
        {entry?.card_summary && <p className="text-sm text-muted-foreground">卡片短摘要（AI 產生）　{entry.card_summary}</p>}
        <p className="text-sm text-muted-foreground">
          {entry
            ? "修改商品類別或案例原文後，儲存時會重新產生標題、手法標籤與卡片短摘要。"
            : "儲存時，AI 會依商品類別和案例原文產生標題、手法標籤與卡片短摘要。"}
        </p>
      </AdminForm>
    </section>
  )
}
