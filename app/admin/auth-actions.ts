"use server"

import { redirect } from "next/navigation"
import type { AdminFormState } from "@/components/admin/form"
import { endAdminSession, startAdminSession } from "@/lib/admin/session"

export async function logIn(_previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  const password = form.get("password")
  if (typeof password !== "string" || !(await startAdminSession(password))) {
    return { error: "密碼錯誤，請再試一次。" }
  }
  redirect("/admin")
}

export async function logOut() {
  await endAdminSession()
  redirect("/admin/login")
}
