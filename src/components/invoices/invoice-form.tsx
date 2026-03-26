"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectOption } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createInvoice, generateFromTimesheets } from "@/lib/actions/invoices"

interface ClientOption {
  id: string
  name: string
  default_currency: string
}

interface InvoiceFormProps {
  clients: ClientOption[]
}

export function InvoiceForm({ clients }: InvoiceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<"manual" | "timesheet">("manual")
  const [error, setError] = useState<string | null>(null)

  // Manual mode fields
  const [clientId, setClientId] = useState("")
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [currency, setCurrency] = useState("USD")
  const [taxRate, setTaxRate] = useState("0")
  const [paymentTerms, setPaymentTerms] = useState("Net 30")
  const [notes, setNotes] = useState("")

  // Timesheet mode fields
  const [tsClientId, setTsClientId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const selectedClient = clients.find((c) => c.id === clientId)

  function handleClientChange(id: string) {
    setClientId(id)
    const client = clients.find((c) => c.id === id)
    if (client) {
      setCurrency(client.default_currency)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId) {
      setError("Please select a client")
      return
    }

    startTransition(async () => {
      try {
        const invoice = await createInvoice({
          client_id: clientId,
          issue_date: issueDate,
          due_date: dueDate,
          currency,
          tax_rate: parseFloat(taxRate) || 0,
          payment_terms: paymentTerms || undefined,
          notes: notes || undefined,
        })
        router.push(`/invoices/${invoice.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create invoice")
      }
    })
  }

  function handleTimesheetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!tsClientId || !startDate || !endDate) {
      setError("Please fill in all fields")
      return
    }

    startTransition(async () => {
      try {
        const invoice = await generateFromTimesheets(
          tsClientId,
          startDate,
          endDate
        )
        router.push(`/invoices/${invoice.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate invoice")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          size="sm"
        >
          Create Manually
        </Button>
        <Button
          variant={mode === "timesheet" ? "default" : "outline"}
          onClick={() => setMode("timesheet")}
          size="sm"
        >
          Generate from Timesheets
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "manual" ? (
        <Card>
          <CardHeader>
            <CardTitle>New Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client</label>
                  <Select
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                  >
                    <SelectOption value="">Select client...</SelectOption>
                    {clients.map((c) => (
                      <SelectOption key={c.id} value={c.id}>
                        {c.name}
                      </SelectOption>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <Select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <SelectOption value="USD">USD</SelectOption>
                    <SelectOption value="EUR">EUR</SelectOption>
                    <SelectOption value="GBP">GBP</SelectOption>
                    <SelectOption value="CHF">CHF</SelectOption>
                    <SelectOption value="CAD">CAD</SelectOption>
                    <SelectOption value="AUD">AUD</SelectOption>
                    <SelectOption value="JPY">JPY</SelectOption>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Issue Date</label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Rate (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Terms</label>
                  <Input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g., Net 30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional invoice notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/invoices")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Generate from Timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTimesheetSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client</label>
                  <Select
                    value={tsClientId}
                    onChange={(e) => setTsClientId(e.target.value)}
                    required
                  >
                    <SelectOption value="">Select client...</SelectOption>
                    {clients.map((c) => (
                      <SelectOption key={c.id} value={c.id}>
                        {c.name}
                      </SelectOption>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                This will create an invoice from all billable time entries for the
                selected client within the date range.
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/invoices")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Generating..." : "Generate Invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
