import { Suspense } from "react"
import { redirect } from "next/navigation"
import { AdminForm } from "@/components/admin/form"
import { TextField } from "@/components/admin/fields"
import { isAdmin, isAdminConfigured } from "@/lib/admin/session"
import { logIn } from "../auth-actions"

async function LoginPanel() {
  if (await isAdmin()) redirect("/admin")

  return (
    <section className="w-full rounded-2xl border bg-card p-6 sm:p-8" aria-labelledby="login-heading">
      <h1 id="login-heading" className="mb-6 text-2xl font-bold tracking-tight">管理員登入</h1>
      {isAdminConfigured() ? (
        <AdminForm action={logIn} label="登入" pendingLabel="登入中…">
          <TextField name="password" label="密碼" type="password" required autoComplete="current-password" />
        </AdminForm>
      ) : (
        <p className="text-sm text-muted-foreground">
          管理員登入尚未設定。請確認伺服器的 <code>ADMIN_PASSWORD</code> 和 <code>ADMIN_SESSION_SECRET</code> 設定。
        </p>
      )}
    </section>
  )
}

export default function AdminLoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center px-5 py-10">
      <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">讀取中…</p>}>
        <LoginPanel />
      </Suspense>
    </main>
  )
}
