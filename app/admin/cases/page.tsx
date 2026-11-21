import Link from "next/link";
import { Suspense } from "react";
import { CaseEditor } from "@/components/admin/case-editor";
import { DocumentLink } from "@/components/admin/document-link";
import { AdminForm } from "@/components/admin/form";
import {
  AdminLoading,
  AdminShell,
  DatabaseNotice,
} from "@/components/admin/shell";
import { readCases } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";
import { regenerateHomepage } from "../data-actions";

type Query = Promise<{ edit?: string | string[] }>;

async function CasesContent({ searchParams }: { searchParams: Query }) {
  const { edit } = await searchParams;
  const cases = await readCases().catch(() => undefined);
  if (!cases) return <DatabaseNotice unavailable={cases === undefined} />;

  const selected = cases.find((record) => record.id === edit);

  return (
    <div className="space-y-6">
      
      <div id="case-editor" className="scroll-mt-40 space-y-3 sm:scroll-mt-44">
        {selected && (
          <Link
            href="/admin/cases#case-editor"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            返回新增表單
          </Link>
        )}
        <CaseEditor
          key={selected?.id ?? `new:${cases[0]?.id ?? ""}`}
          entry={selected}
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">官方案例</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {cases.length} 筆案例。儲存成功後，Widget 查證可找到相關案例。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminForm
            action={regenerateHomepage}
            label="更新首頁案例卡"
            pendingLabel="更新中…"
            inline
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[78rem] text-left text-sm">
          <thead className="border-b bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3">標題（AI 產生）</th>
              <th className="px-4 py-3 whitespace-nowrap">商品類別</th>
              <th className="px-4 py-3 whitespace-nowrap">
                手法標籤（AI 產生）
              </th>
              <th className="px-4 py-3 whitespace-nowrap">案例原文</th>
              <th className="px-4 py-3 whitespace-nowrap">
                卡片短摘要（AI 產生）
              </th>
              <th className="px-4 py-3 whitespace-nowrap">來源機關</th>
              <th className="px-4 py-3 whitespace-nowrap">發布日期</th>
              <th className="px-4 py-3 whitespace-nowrap">發布縣市</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cases.map((record) => (
              <tr key={record.id} className="align-top">
                <td className="px-4 py-2 font-medium">{record.title}</td>
                <td className="px-4 py-2">{record.product_type}</td>
                <td className="min-w-36 px-4 py-2">
                  {record.method_tags.length > 0 ? (
                    <ul className="flex flex-wrap gap-1" aria-label="手法標籤">
                      {record.method_tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-md bg-muted px-2 py-1 text-xs"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="w-56 min-w-56 px-4 py-2">
                  <details className="group">
                    <summary className="cursor-pointer rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                      <span className="group-open:hidden">查看原文</span>
                      <span className="hidden group-open:inline">收合原文</span>
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {record.summary}
                    </p>
                  </details>
                </td>
                <td className="w-48 min-w-48 px-4 py-2 [overflow-wrap:anywhere]">
                  {record.card_summary || (
                    <span className="text-muted-foreground">尚未產生</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <DocumentLink href={record.source_url}>
                    {record.source_name}
                  </DocumentLink>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {record.source_date}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {record.source_city}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {record.included ? "已收錄" : "草稿"}
                </td>
                <td className="px-4">
                  <Link
                    href={`/admin/cases?edit=${encodeURIComponent(record.id)}#case-editor`}
                    className="inline-flex min-h-11 items-center underline underline-offset-4"
                    aria-label={`編輯案例 ${record.title}`}
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
            {!cases.length && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={10}>
                  尚未建立案例。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CasesPage({ searchParams }: { searchParams: Query }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProtectedCases searchParams={searchParams} />
    </Suspense>
  );
}

async function ProtectedCases({ searchParams }: { searchParams: Query }) {
  await requireAdmin();
  return (
    <AdminShell section="/admin/cases">
      <CasesContent searchParams={searchParams} />
    </AdminShell>
  );
}
