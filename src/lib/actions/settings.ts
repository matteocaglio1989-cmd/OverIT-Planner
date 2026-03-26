"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getOrganization() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return null

  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single()

  return data
}

export async function updateOrganization(data: {
  name?: string
  logo_url?: string | null
  default_currency?: string
  fiscal_year_start?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id || profile.role !== "admin") {
    return { error: "Not authorized" }
  }

  const { error } = await supabase
    .from("organizations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", profile.organization_id)

  if (error) return { error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

export async function getHolidays() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("public_holidays")
    .select("*")
    .order("date", { ascending: true })

  return data ?? []
}

export async function createHoliday(data: {
  country_code: string
  date: string
  name: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return { error: "No organization" }

  const { error } = await supabase
    .from("public_holidays")
    .insert({
      ...data,
      organization_id: profile.organization_id,
    })

  if (error) return { error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteHoliday(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("public_holidays")
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

export async function getOrgMembers() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .order("full_name")

  return data ?? []
}

export async function updateMemberRole(profileId: string, role: "admin" | "manager" | "consultant") {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId)

  if (error) return { error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

export async function inviteMember(email: string, role: "admin" | "manager" | "consultant") {
  // In a real app, this would send an invitation email via Supabase Auth
  // For now, return a placeholder
  return { success: true, message: `Invitation sent to ${email} as ${role}` }
}
