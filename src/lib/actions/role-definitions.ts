"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { RoleDefinition } from "@/lib/types/database"

async function getOrgId() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  return { supabase, organizationId: profile.organization_id }
}

export async function getRoleDefinitions(): Promise<RoleDefinition[]> {
  const { supabase, organizationId } = await getOrgId()

  const { data, error } = await supabase
    .from("role_definitions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name")

  if (error) throw error

  return (data ?? []) as RoleDefinition[]
}

export async function createRoleDefinition(data: {
  name: string
  default_bill_rate?: number | null
  description?: string | null
}) {
  const { supabase, organizationId } = await getOrgId()

  const { error } = await supabase.from("role_definitions").insert({
    organization_id: organizationId,
    name: data.name,
    default_bill_rate: data.default_bill_rate ?? null,
    description: data.description || null,
  })

  if (error) throw error

  revalidatePath("/settings/roles")
}

export async function updateRoleDefinition(
  id: string,
  data: Partial<Pick<RoleDefinition, "name" | "default_bill_rate" | "description">>
) {
  const supabase = (await getOrgId()).supabase

  const { error } = await supabase
    .from("role_definitions")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error

  revalidatePath("/settings/roles")
}

export async function deleteRoleDefinition(id: string) {
  const supabase = (await getOrgId()).supabase

  const { error } = await supabase
    .from("role_definitions")
    .delete()
    .eq("id", id)

  if (error) throw error

  revalidatePath("/settings/roles")
}
