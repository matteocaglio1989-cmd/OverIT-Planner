"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  Allocation,
  AllocationStatus,
  Absence,
  PublicHoliday,
} from "@/lib/types/database"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Allocations
// ---------------------------------------------------------------------------

export async function getAllocations(startDate: string, endDate: string) {
  const { supabase, organizationId } = await getOrgId()

  const { data, error } = await supabase
    .from("allocations")
    .select("*, project:projects(*), profile:profiles(*)")
    .eq("organization_id", organizationId)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .order("start_date")

  if (error) throw error

  return (data ?? []) as (Allocation & {
    project: Allocation["project"]
    profile: Allocation["profile"]
  })[]
}

export async function createAllocation(data: {
  project_id: string
  profile_id: string
  start_date: string
  end_date: string
  hours_per_day: number
  status?: AllocationStatus
  notes?: string | null
  bill_rate?: number | null
  project_role_id?: string | null
}) {
  const { supabase, organizationId } = await getOrgId()

  const { error } = await supabase.from("allocations").insert({
    organization_id: organizationId,
    project_id: data.project_id,
    profile_id: data.profile_id,
    start_date: data.start_date,
    end_date: data.end_date,
    hours_per_day: data.hours_per_day,
    status: data.status || "tentative",
    notes: data.notes || null,
    bill_rate: data.bill_rate ?? null,
    project_role_id: data.project_role_id || null,
  })

  if (error) throw error

  revalidatePath("/timeline")
}

export async function updateAllocation(
  id: string,
  data: Partial<
    Pick<
      Allocation,
      | "start_date"
      | "end_date"
      | "hours_per_day"
      | "status"
      | "notes"
      | "bill_rate"
      | "project_id"
      | "profile_id"
      | "project_role_id"
    >
  >
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("allocations")
    .update(data)
    .eq("id", id)

  if (error) throw error

  revalidatePath("/timeline")
}

export async function deleteAllocation(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("allocations").delete().eq("id", id)

  if (error) throw error

  revalidatePath("/timeline")
}

// ---------------------------------------------------------------------------
// Absences
// ---------------------------------------------------------------------------

export async function getAbsences(startDate: string, endDate: string) {
  const { supabase, organizationId } = await getOrgId()

  // Fetch absences for all profiles in the organization
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)

  if (!profiles || profiles.length === 0) return [] as Absence[]

  const profileIds = profiles.map((p) => p.id)

  const { data, error } = await supabase
    .from("absences")
    .select("*")
    .in("profile_id", profileIds)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .order("start_date")

  if (error) throw error

  return (data ?? []) as Absence[]
}

// ---------------------------------------------------------------------------
// Public Holidays
// ---------------------------------------------------------------------------

export async function getHolidays(startDate: string, endDate: string) {
  const { supabase, organizationId } = await getOrgId()

  const { data, error } = await supabase
    .from("public_holidays")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date")

  if (error) throw error

  return (data ?? []) as PublicHoliday[]
}
