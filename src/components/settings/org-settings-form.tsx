"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectOption } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOrganization } from "@/lib/actions/settings"
import type { Organization } from "@/lib/types/database"

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface OrgSettingsFormProps {
  organization: Organization
}

export function OrgSettingsForm({ organization }: OrgSettingsFormProps) {
  const [name, setName] = useState(organization.name)
  const [currency, setCurrency] = useState(organization.default_currency)
  const [fiscalYear, setFiscalYear] = useState(String(organization.fiscal_year_start))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const result = await updateOrganization({
      name,
      default_currency: currency,
      fiscal_year_start: parseInt(fiscalYear),
    })

    setLoading(false)
    if (result.error) {
      setMessage(`Error: ${result.error}`)
    } else {
      setMessage("Settings saved successfully")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>Manage your organization settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <SelectOption key={c} value={c}>{c}</SelectOption>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fiscal-year">Fiscal Year Start</Label>
            <Select
              id="fiscal-year"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            >
              {MONTHS.map((m, i) => (
                <SelectOption key={i + 1} value={String(i + 1)}>{m}</SelectOption>
              ))}
            </Select>
          </div>
          {message && (
            <p className={`text-sm ${message.startsWith("Error") ? "text-destructive" : "text-green-600"}`}>
              {message}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
