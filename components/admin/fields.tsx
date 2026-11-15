import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const control = "w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-ring"

type TextFieldProps = Omit<ComponentProps<"input">, "id" | "name"> & {
  name: string
  label: string
}

export function TextField({ name, label, className, ...props }: TextFieldProps) {
  return (
    <label className="block space-y-1.5 text-sm font-medium" htmlFor={name}>
      <span className="block"> {label}</span>
      <input {...props} name={name} id={name} className={cn(control, "min-h-11", className)} />
    </label>
  )
}

export function TextAreaField({
  name,
  label,
  ...props
}: Omit<ComponentProps<"textarea">, "id" | "name"> & { name: string; label: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium" htmlFor={name}>
      <span>{label}</span>
      <textarea {...props} name={name} id={name} className={cn(control, "min-h-24 resize-y", props.className)} />
    </label>
  )
}
