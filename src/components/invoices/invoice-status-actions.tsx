"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { updateInvoiceStatus } from "@/lib/actions/invoices"
import type { InvoiceStatus } from "@/lib/types/database"

interface InvoiceStatusActionsProps {
  invoiceId: string
  status: InvoiceStatus
}

const TRANSITIONS: Record<InvoiceStatus, { label: string; next: InvoiceStatus }[]> = {
  draft: [{ label: "Mark as Sent", next: "sent" }],
  sent: [
    { label: "Mark as Paid", next: "paid" },
    { label: "Mark as Overdue", next: "overdue" },
  ],
  overdue: [{ label: "Mark as Paid", next: "paid" }],
  paid: [],
  cancelled: [],
}

export function InvoiceStatusActions({ invoiceId, status }: InvoiceStatusActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const transitions = TRANSITIONS[status]

  if (transitions.length === 0) return null

  async function handleTransition(nextStatus: InvoiceStatus) {
    setLoading(true)
    await updateInvoiceStatus(invoiceId, nextStatus)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      {transitions.map((t) => (
        <Button
          key={t.next}
          variant={t.next === "paid" ? "default" : "outline"}
          size="sm"
          disabled={loading}
          onClick={() => handleTransition(t.next)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
