"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { AdminFormState } from "@/components/admin/form"
import { writeAccount, writeCase } from "@/lib/admin/data"
import { InvalidAdminInput } from "@/lib/admin/form-values"
import { requireAdmin } from "@/lib/admin/session"
import { prepareHomepageCards } from "@/lib/server/retrieval"

function failed(error: unknown, message: string): AdminFormState {
  return { error: error instanceof InvalidAdminInput ? error.message : message }
}

export async function saveCase(id: string | null, _previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin()
  try {
    await writeCase(id, form)
  } catch (error) {
    return failed(error, "案例儲存失敗。請確認資料庫已完成初始化。")
  }
  revalidatePath("/admin/cases")
  revalidatePath("/")
  redirect("/admin/cases")
}

export async function saveAccount(id: string | null, _previous: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin()
  try {
    await writeAccount(id, form)
  } catch (error) {
    return failed(error, "帳號儲存失敗。請確認資料庫已完成初始化。")
  }
  revalidatePath("/admin/accounts")
  redirect("/admin/accounts")
}

export async function regenerateHomepage(): Promise<AdminFormState> {
  await requireAdmin()
  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
    return { error: "請先設定 Neon 與 OpenAI，再更新首頁案例卡。" }
  }

  try {
    const cards = await prepareHomepageCards()
    revalidatePath("/")
    return { success: `已更新首頁的 ${cards.length} 張案例卡。` }
  } catch {
    return { error: "無法更新首頁案例卡。請檢查資料庫及 OpenAI 設定，再重新嘗試。" }
  }
}
