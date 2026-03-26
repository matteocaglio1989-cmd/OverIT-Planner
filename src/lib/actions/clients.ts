"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Client, Project } from "@/lib/types/database"

export async function getClients(): Promise<
  (Client & { projects_count: number })[]
> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("name")

  if (error) throw error

  const clientIds = (clients ?? []).map((c) => c.id)

  const { data: projects } = await supabase
    .from("projects")
    .select("id, client_id")
    .in("client_id", clientIds.length > 0 ? clientIds : ["__none__"])

  const countByClient = new Map<string, number>()
  for (const p of projects ?? []) {
    if (p.client_id) {
      countByClient.set(p.client_id, (countByClient.get(p.client_id) ?? 0) + 1)
    }
  }

  return (clients ?? []).map((c) => ({
    ...c,
    projects_count: countByClient.get(c.id) ?? 0,
  }))
}

export async function getClient(
  id: string
): Promise<(Client & { projects: Pick<Project, "id" | "name" | "status">[] }) | null> {
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !client) return null

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("client_id", id)
    .order("name")

  return { ...client, projects: projects ?? [] }
}

export async function createClientAction(data: {
  name: string
  contact_name?: string | null
  contact_email?: string | null
  billing_address?: string | null
  tax_id?: string | null
  default_currency?: string
  notes?: string | null
}) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  const { error } = await supabase.from("clients").insert({
    organization_id: profile.organization_id,
    name: data.name,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    billing_address: data.billing_address || null,
    tax_id: data.tax_id || null,
    default_currency: data.default_currency || "USD",
    notes: data.notes || null,
  })

  if (error) throw error

  revalidatePath("/clients")
}

export async function updateClient(
  id: string,
  data: Partial<
    Pick<
      Client,
      | "name"
      | "contact_name"
      | "contact_email"
      | "billing_address"
      | "tax_id"
      | "default_currency"
      | "notes"
    >
  >
) {
  const supabase = await createClient()

  const { error } = await supabase.from("clients").update(data).eq("id", id)

  if (error) throw error

  revalidatePath("/clients")
  revalidatePath(`/clients/${id}`)
}

export async function deleteClient(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("clients").delete().eq("id", id)

  if (error) throw error

  revalidatePath("/clients")
}
