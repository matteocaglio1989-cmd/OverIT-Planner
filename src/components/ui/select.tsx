import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

function Select({
  className,
  children,
  ref,
  ...props
}: SelectProps & { ref?: React.Ref<HTMLSelectElement> }) {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

function SelectOption({
  className,
  ...props
}: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return <option className={cn("", className)} {...props} />
}

export { Select, SelectOption }
