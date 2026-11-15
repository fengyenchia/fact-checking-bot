"use client"

import { type FormEvent, type ReactNode, startTransition, useActionState } from "react"
import { Button } from "@/components/ui/button"

export type AdminFormState = {
  error?: string
  success?: string
}

type FormAction = (state: AdminFormState, data: FormData) => Promise<AdminFormState>

export function AdminForm({
  action,
  children,
  label = "儲存",
  pendingLabel = "處理中…",
  inline = false,
}: {
  action: FormAction
  children?: ReactNode
  label?: string
  pendingLabel?: string
  inline?: boolean
}) {
  const [state, submit, pending] = useActionState(action, {})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    startTransition(() => submit(data))
  }

  return (
    <form action={submit} onSubmit={handleSubmit} className={inline ? "flex flex-col items-start gap-2" : "space-y-4"}>
      <fieldset disabled={pending} className={inline ? "contents" : "space-y-4"}>
        {children}
        <Button type="submit" size="lg" className="min-h-11 px-4">
          {pending ? pendingLabel : label}
        </Button>
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-muted-foreground">{state.success}</p>}
    </form>
  )
}
