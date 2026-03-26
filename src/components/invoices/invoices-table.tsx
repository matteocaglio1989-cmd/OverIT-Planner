"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectOption } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils/currency"
import type { Invoice, InvoiceStatus } from "@/lib/types/database"

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
}

interface InvoiceWithClient extends Omit<Invoice, 'client'> {
  client: { id: string; name: string } | null
}

interface InvoicesTableProps {
  invoices: InvoiceWithClient[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered =
    statusFilter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            Status:
          </label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <SelectOption value="all">All</SelectOption>
            <SelectOption value="draft">Draft</SelectOption>
            <SelectOption value="sent">Sent</SelectOption>
            <SelectOption value="paid">Paid</SelectOption>
            <SelectOption value="overdue">Overdue</SelectOption>
            <SelectOption value="cancelled">Cancelled</SelectOption>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Currency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No invoices found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer"
                onClick={() => router.push(`/invoices/${invoice.id}`)}
              >
                <TableCell className="font-medium">
                  {invoice.invoice_number}
                </TableCell>
                <TableCell>{invoice.client?.name ?? "N/A"}</TableCell>
                <TableCell>
                  <Badge className={STATUS_STYLES[invoice.status]}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>{invoice.issue_date ?? "-"}</TableCell>
                <TableCell>{invoice.due_date ?? "-"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell>{invoice.currency}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
