import Link from "next/link";
import { Suspense } from "react";
import { AccountEditor } from "@/components/admin/account-editor";
import { DocumentLink } from "@/components/admin/document-link";
import {
  AdminLoading,
  AdminShell,
  DatabaseNotice,
} from "@/components/admin/shell";
import { readAccounts } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";

type Query = Promise<{ edit?: string | string[] }>;

async function AccountsContent({ searchParams }: { searchParams: Query }) {
  const { edit } = await searchParams;
  const accounts = await readAccounts().catch(() => undefined);
  if (!accounts) return <DatabaseNotice unavailable={accounts === undefined} />;
  const selected = accounts.find((account) => account.id === edit);

  return (
    <div className="space-y-6">
      <div
        id="account-editor"
        className="scroll-mt-40 space-y-3 sm:scroll-mt-44"
      >
        {selected && (
          <Link
            href="/admin/accounts#account-editor"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            返回新增表單
          </Link>
        )}
        <AccountEditor
          key={selected?.id ?? `new:${accounts[0]?.id ?? ""}`}
          entry={selected}
        />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold">可疑 Threads 帳號</h2>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead className="border-b bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Threads 帳號</th>
              <th className="px-4 py-3 whitespace-nowrap">案件狀態</th>
              <th className="px-4 py-3 whitespace-nowrap">查詢人數</th>
              <th className="px-4 py-3 whitespace-nowrap">資料連結</th>
              <th className="px-4 py-3">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="break-all px-4 py-2 font-medium">{`@${account.id}`}</td>
                <td className="px-4 py-2">{account.case_status ?? "—"}</td>
                <td className="px-4 py-2 tabular-nums">
                  {account.lookup_count ?? "—"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {account.source_url ? (
                    <DocumentLink href={account.source_url}>
                      查看來源
                    </DocumentLink>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4">
                  <Link
                    href={`/admin/accounts?edit=${encodeURIComponent(account.id)}#account-editor`}
                    className="inline-flex min-h-11 items-center whitespace-nowrap underline underline-offset-4"
                    aria-label={`編輯帳號 ${account.id}`}
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
            {!accounts.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                  尚未新增可疑帳號。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AccountsPage({
  searchParams,
}: {
  searchParams: Query;
}) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProtectedAccounts searchParams={searchParams} />
    </Suspense>
  );
}

async function ProtectedAccounts({ searchParams }: { searchParams: Query }) {
  await requireAdmin();
  return (
    <AdminShell section="/admin/accounts">
      <AccountsContent searchParams={searchParams} />
    </AdminShell>
  );
}
