"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Invoice, InvoiceLineItem, InvoiceStatus } from "@/lib/types/database"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthInfo() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  return { supabase, userId: user.user.id, organizationId: profile.organization_id }
}

async function generateInvoiceNumber(organizationId: string) {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("organization_id", organizationId)
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].invoice_number.replace(prefix, ""), 10)
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`
}

// ---------------------------------------------------------------------------
// Invoices CRUD
// ---------------------------------------------------------------------------

export async function getInvoices() {
  const { supabase, organizationId } = await getAuthInfo()

  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(id, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []) as (Invoice & { client: { id: string; name: string } | null })[]
}

export async function getInvoice(id: string) {
  const { supabase } = await getAuthInfo()

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, client:clients(*)")
    .eq("id", id)
    .single()

  if (error) throw error

  const { data: lineItems, error: lineError } = await supabase
    .from("invoice_line_items")
    .select("*, project:projects(id, name)")
    .eq("invoice_id", id)
    .order("sort_order")

  if (lineError) throw lineError

  return {
    ...(invoice as Invoice),
    line_items: (lineItems ?? []) as InvoiceLineItem[],
  }
}

export async function createInvoice(data: {
  client_id: string
  issue_date: string
  due_date: string
  currency: string
  tax_rate?: number
  payment_terms?: string
  notes?: string
}) {
  const { supabase, organizationId } = await getAuthInfo()

  const invoiceNumber = await generateInvoiceNumber(organizationId)

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organizationId,
      client_id: data.client_id,
      invoice_number: invoiceNumber,
      status: "draft" as InvoiceStatus,
      issue_date: data.issue_date,
      due_date: data.due_date,
      currency: data.currency,
      tax_rate: data.tax_rate ?? 0,
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      payment_terms: data.payment_terms ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath("/invoices")

  return invoice as Invoice
}

export async function updateInvoice(
  id: string,
  data: {
    issue_date?: string
    due_date?: string
    currency?: string
    tax_rate?: number
    payment_terms?: string
    notes?: string
  }
) {
  const { supabase } = await getAuthInfo()

  const { error } = await supabase
    .from("invoices")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${id}`)
}

export async function deleteInvoice(id: string) {
  const { supabase } = await getAuthInfo()

  // Only allow deleting draft invoices
  const { data: invoice } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single()

  if (invoice?.status !== "draft") {
    throw new Error("Only draft invoices can be deleted")
  }

  const { error } = await supabase.from("invoices").delete().eq("id", id)

  if (error) throw error

  revalidatePath("/invoices")
}

// ---------------------------------------------------------------------------
// Line Items
// ---------------------------------------------------------------------------

async function recalculateInvoiceTotals(invoiceId: string) {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from("invoice_line_items")
    .select("amount")
    .eq("invoice_id", invoiceId)

  const subtotal = (items ?? []).reduce((sum, item) => sum + item.amount, 0)

  const { data: invoice } = await supabase
    .from("invoices")
    .select("tax_rate")
    .eq("id", invoiceId)
    .single()

  const taxRate = invoice?.tax_rate ?? 0
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  await supabase
    .from("invoices")
    .update({ subtotal, tax_amount: taxAmount, total })
    .eq("id", invoiceId)
}

export async function addLineItem(
  invoiceId: string,
  data: {
    description: string
    quantity: number
    unit_price: number
    project_id?: string
  }
) {
  const { supabase } = await getAuthInfo()

  // Get next sort_order
  const { data: existing } = await supabase
    .from("invoice_line_items")
    .select("sort_order")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: false })
    .limit(1)

  const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const amount = data.quantity * data.unit_price

  const { error } = await supabase.from("invoice_line_items").insert({
    invoice_id: invoiceId,
    description: data.description,
    quantity: data.quantity,
    unit_price: data.unit_price,
    amount,
    sort_order: sortOrder,
    project_id: data.project_id ?? null,
  })

  if (error) throw error

  await recalculateInvoiceTotals(invoiceId)

  revalidatePath(`/invoices/${invoiceId}`)
}

export async function updateLineItem(
  id: string,
  data: {
    description?: string
    quantity?: number
    unit_price?: number
  }
) {
  const { supabase } = await getAuthInfo()

  // Get current line item
  const { data: current } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("id", id)
    .single()

  if (!current) throw new Error("Line item not found")

  const quantity = data.quantity ?? current.quantity
  const unitPrice = data.unit_price ?? current.unit_price
  const amount = quantity * unitPrice

  const { error } = await supabase
    .from("invoice_line_items")
    .update({
      description: data.description ?? current.description,
      quantity,
      unit_price: unitPrice,
      amount,
    })
    .eq("id", id)

  if (error) throw error

  await recalculateInvoiceTotals(current.invoice_id)

  revalidatePath(`/invoices/${current.invoice_id}`)
}

export async function removeLineItem(id: string) {
  const { supabase } = await getAuthInfo()

  const { data: item } = await supabase
    .from("invoice_line_items")
    .select("invoice_id")
    .eq("id", id)
    .single()

  if (!item) throw new Error("Line item not found")

  const { error } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("id", id)

  if (error) throw error

  await recalculateInvoiceTotals(item.invoice_id)

  revalidatePath(`/invoices/${item.invoice_id}`)
}

// ---------------------------------------------------------------------------
// Generate from Timesheets
// ---------------------------------------------------------------------------

export async function generateFromTimesheets(
  clientId: string,
  startDate: string,
  endDate: string
) {
  const { supabase, organizationId } = await getAuthInfo()

  // Get client info
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (!client) throw new Error("Client not found")

  // Get projects for this client
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", clientId)
    .eq("is_billable", true)

  if (!projects || projects.length === 0) {
    throw new Error("No billable projects found for this client")
  }

  const projectIds = projects.map((p) => p.id)
  const projectMap = new Map(projects.map((p) => [p.id, p.name]))

  // Get approved timesheet entries for the date range
  const { data: entries } = await supabase
    .from("time_entries")
    .select("*, profile:profiles(id, full_name, default_bill_rate)")
    .in("project_id", projectIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("is_billable", true)

  if (!entries || entries.length === 0) {
    throw new Error("No billable time entries found for the selected period")
  }

  // Group entries by project
  const grouped = new Map<string, { hours: number; rate: number }>()
  for (const entry of entries) {
    const key = entry.project_id!
    const existing = grouped.get(key) ?? { hours: 0, rate: 0 }
    existing.hours += entry.hours
    // Use the profile's bill rate or a default
    const rate = (entry.profile as { default_bill_rate: number | null })?.default_bill_rate ?? 100
    if (existing.rate === 0) existing.rate = rate
    grouped.set(key, existing)
  }

  // Create the invoice
  const invoiceNumber = await generateInvoiceNumber(organizationId)
  const today = new Date().toISOString().split("T")[0]
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      invoice_number: invoiceNumber,
      status: "draft" as InvoiceStatus,
      issue_date: today,
      due_date: dueDate,
      currency: client.default_currency,
      tax_rate: 0,
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      payment_terms: "Net 30",
    })
    .select()
    .single()

  if (invError) throw invError

  // Create line items
  let sortOrder = 0
  for (const [projectId, info] of grouped.entries()) {
    const projectName = projectMap.get(projectId) ?? "Services"
    const amount = info.hours * info.rate

    await supabase.from("invoice_line_items").insert({
      invoice_id: invoice.id,
      project_id: projectId,
      description: `${projectName} - ${info.hours}h @ ${info.rate}/hr (${startDate} to ${endDate})`,
      quantity: info.hours,
      unit_price: info.rate,
      amount,
      sort_order: sortOrder++,
    })
  }

  await recalculateInvoiceTotals(invoice.id)

  revalidatePath("/invoices")

  return invoice as Invoice
}

// ---------------------------------------------------------------------------
// Status Transitions
// ---------------------------------------------------------------------------

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const { supabase } = await getAuthInfo()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === "sent") {
    updateData.sent_at = new Date().toISOString()
  } else if (status === "paid") {
    updateData.paid_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id)

  if (error) throw error

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${id}`)
}

// ---------------------------------------------------------------------------
// Clients for select dropdown
// ---------------------------------------------------------------------------

export async function getClientsForSelect() {
  const { supabase, organizationId } = await getAuthInfo()

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, default_currency")
    .eq("organization_id", organizationId)
    .order("name")

  if (error) throw error

  return (data ?? []) as { id: string; name: string; default_currency: string }[]
}
