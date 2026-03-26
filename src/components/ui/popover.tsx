"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
})

function Popover({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const onOpenChange = controlledOnOpenChange ?? setUncontrolledOpen
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  return (
    <PopoverContext.Provider value={{ open, onOpenChange, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({
  className,
  children,
  asChild,
  ref,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  ref?: React.Ref<HTMLButtonElement>
}) {
  const { open, onOpenChange, triggerRef } = React.useContext(PopoverContext)
  return (
    <button
      type="button"
      ref={(node) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
      }}
      className={cn("", className)}
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  )
}

function PopoverContent({
  className,
  children,
  align = "center",
  sideOffset = 4,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end"
  sideOffset?: number
  ref?: React.Ref<HTMLDivElement>
}) {
  const { open, onOpenChange } = React.useContext(PopoverContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest("[aria-expanded]")
      ) {
        onOpenChange(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      ref={(node) => {
        (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      className={cn(
        "absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className
      )}
      style={{ marginTop: sideOffset }}
      {...props}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
