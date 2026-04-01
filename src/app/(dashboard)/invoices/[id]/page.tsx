import { requireRole } from "@/lib/auth-guard"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getInvoice } from "@/lib/actions/invoices"
import { LineItemsEditor } from "@/components/invoices/line-items-editor"
import { InvoicePDF } from "@/components/invoices/invoice-pdf"
import { InvoiceStatusActions } from "@/components/invoices/invoice-status-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import type { InvoiceStatus } from "@/lib/types/database"

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  overdue: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
}

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["super_admin", "admin", "manager"])
  const { id } = await params

  let invoice
  try {
    invoice = await getInvoice(id)
  } catch {
    notFound()
  }

  const isDraft = invoice.status === "draft"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {invoice.invoice_number}
            </h1>
            <p className="text-muted-foreground mt-1">
              {invoice.client?.name ?? "No client"}
            </p>
          </div>
          <Badge className={STATUS_STYLES[invoice.status]}>
            {invoice.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <InvoicePDF invoice={invoice} lineItems={invoice.line_items} />
          <InvoiceStatusActions invoiceId={invoice.id} status={invoice.status} />
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Issue Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{invoice.issue_date ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{invoice.due_date ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {formatCurrency(invoice.total, invoice.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Terms & Notes */}
      {(invoice.payment_terms || invoice.notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoice.payment_terms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Payment Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{invoice.payment_terms}</p>
              </CardContent>
            </Card>
          )}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor
            invoiceId={invoice.id}
            lineItems={invoice.line_items}
            currency={invoice.currency}
            taxRate={invoice.tax_rate}
            subtotal={invoice.subtotal}
            taxAmount={invoice.tax_amount}
            total={invoice.total}
            readonly={!isDraft}
          />
        </CardContent>
      </Card>
    </div>
  )
}
