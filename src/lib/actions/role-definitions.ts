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

export async function syncRolesFromProjects(): Promise<{ imported: number; skipped: number }> {
  const { supabase, organizationId } = await getOrgId()

  // Get existing role definition names
  const { data: existing } = await supabase
    .from("role_definitions")
    .select("name")
    .eq("organization_id", organizationId)

  const existingNames = new Set((existing || []).map((r) => r.name.toLowerCase()))

  // Get distinct project role titles with their max bill rate
  const { data: projectRoles } = await supabase
    .from("project_roles")
    .select("title, bill_rate, projects!inner(organization_id)")
    .eq("projects.organization_id", organizationId)

  if (!projectRoles || projectRoles.length === 0) {
    return { imported: 0, skipped: 0 }
  }

  // Deduplicate by title, keeping the highest bill rate
  const roleMap = new Map<string, number | null>()
  for (const pr of projectRoles) {
    const key = pr.title.toLowerCase()
    if (!existingNames.has(key)) {
      const currentRate = roleMap.get(key)
      const newRate = pr.bill_rate ? Number(pr.bill_rate) : null
      if (currentRate === undefined || (newRate && (!currentRate || newRate > currentRate))) {
        roleMap.set(key, newRate)
      } else if (!roleMap.has(key)) {
        roleMap.set(key, newRate)
      }
    }
  }

  // Keep original casing from first occurrence
  const titleCasing = new Map<string, string>()
  for (const pr of projectRoles) {
    const key = pr.title.toLowerCase()
    if (!titleCasing.has(key)) titleCasing.set(key, pr.title)
  }

  let imported = 0
  for (const [key, billRate] of roleMap) {
    const { error } = await supabase.from("role_definitions").insert({
      organization_id: organizationId,
      name: titleCasing.get(key) || key,
      default_bill_rate: billRate,
      description: "Imported from project roles",
    })
    if (!error) imported++
  }

  const skipped = (projectRoles.length > 0 ? new Set(projectRoles.map((r) => r.title.toLowerCase())).size : 0) - roleMap.size

  revalidatePath("/settings/roles")
  return { imported, skipped }
}
