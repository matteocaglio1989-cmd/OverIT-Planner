"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectOption } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { createClientAction, updateClient } from "@/lib/actions/clients"
import type { Client } from "@/lib/types/database"

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "JPY"]

interface ClientFormCreateProps {
  mode: "create"
}

interface ClientFormEditProps {
  mode: "edit"
  client: Client
}

type ClientFormProps = ClientFormCreateProps | ClientFormEditProps

export function ClientForm(props: ClientFormProps) {
  if (props.mode === "create") {
    return <ClientFormCreate />
  }
  return <ClientFormEdit client={props.client} />
}

function ClientFormCreate() {
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    const formData = new FormData(e.currentTarget)

    try {
      await createClientAction({
        name: formData.get("name") as string,
        contact_name: (formData.get("contact_name") as string) || null,
        contact_email: (formData.get("contact_email") as string) || null,
        billing_address: (formData.get("billing_address") as string) || null,
        tax_id: (formData.get("tax_id") as string) || null,
        default_currency: (formData.get("default_currency") as string) || "USD",
        notes: (formData.get("notes") as string) || null,
      })
      setOpen(false)
      setMessage("")
    } catch {
      setMessage("Failed to create client.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>New Client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
          <DialogDescription>
            Add a new client to your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create_name">Name</Label>
            <Input id="create_name" name="name" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create_contact_name">Contact Name</Label>
              <Input id="create_contact_name" name="contact_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_contact_email">Contact Email</Label>
              <Input
                id="create_contact_email"
                name="contact_email"
                type="email"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create_tax_id">Tax ID</Label>
              <Input id="create_tax_id" name="tax_id" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_default_currency">Currency</Label>
              <Select
                id="create_default_currency"
                name="default_currency"
                defaultValue="USD"
              >
                {CURRENCIES.map((c) => (
                  <SelectOption key={c} value={c}>
                    {c}
                  </SelectOption>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_billing_address">Billing Address</Label>
            <Textarea id="create_billing_address" name="billing_address" rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_notes">Notes</Label>
            <Textarea id="create_notes" name="notes" rows={2} />
          </div>

          {message && (
            <p className="text-sm text-destructive">{message}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ClientFormEdit({ client }: { client: Client }) {
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    const formData = new FormData(e.currentTarget)

    try {
      await updateClient(client.id, {
        name: formData.get("name") as string,
        contact_name: (formData.get("contact_name") as string) || null,
        contact_email: (formData.get("contact_email") as string) || null,
        billing_address: (formData.get("billing_address") as string) || null,
        tax_id: (formData.get("tax_id") as string) || null,
        default_currency: (formData.get("default_currency") as string) || "USD",
        notes: (formData.get("notes") as string) || null,
      })
      setMessage("Client updated successfully.")
    } catch {
      setMessage("Failed to update client.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={client.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                name="contact_name"
                defaultValue={client.contact_name ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={client.contact_email ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input
                id="tax_id"
                name="tax_id"
                defaultValue={client.tax_id ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_currency">Currency</Label>
              <Select
                id="default_currency"
                name="default_currency"
                defaultValue={client.default_currency}
              >
                {CURRENCIES.map((c) => (
                  <SelectOption key={c} value={c}>
                    {c}
                  </SelectOption>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_address">Billing Address</Label>
            <Textarea
              id="billing_address"
              name="billing_address"
              rows={2}
              defaultValue={client.billing_address ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={client.notes ?? ""}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {message && (
              <span className="text-sm text-muted-foreground">{message}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
