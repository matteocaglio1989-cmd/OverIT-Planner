import Link from "next/link"
import { getInvoices, getClientsForSelect } from "@/lib/actions/invoices"
import { InvoicesTable } from "@/components/invoices/invoices-table"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { Button } from "@/components/ui/button"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const params = await searchParams
  const showNew = params.new === "1"

  const [invoices, clients] = await Promise.all([
    getInvoices(),
    showNew ? getClientsForSelect() : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Manage invoices and billing.
          </p>
        </div>
        {!showNew && (
          <Link href="/invoices?new=1">
            <Button>
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New Invoice
            </Button>
          </Link>
        )}
      </div>

      {showNew && <InvoiceForm clients={clients} />}

      <InvoicesTable invoices={invoices} />
    </div>
  )
}
