"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  Allocation,
  AllocationStatus,
  Absence,
  PublicHoliday,
} from "@/lib/types/database"
import { recalculateRoleFilled } from "@/lib/actions/staffing"

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

  // If linked to a project role, recalculate whether it's filled
  if (data.project_role_id) {
    await recalculateRoleFilled(data.project_role_id, supabase)
  }

  revalidatePath("/timeline")
  revalidatePath("/staffing")
  revalidatePath(`/projects/${data.project_id}`)
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

  const { data: allocation } = await supabase
    .from("allocations")
    .select("project_id, project_role_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("allocations")
    .update(data)
    .eq("id", id)

  if (error) throw error

  // Sync bill_rate back to role if changed
  const roleId = data.project_role_id ?? allocation?.project_role_id
  if (roleId && data.bill_rate !== undefined) {
    await supabase
      .from("project_roles")
      .update({ bill_rate: data.bill_rate })
      .eq("id", roleId)
  }

  // Recalculate filled status if hours or role link changed
  if (roleId && (data.hours_per_day !== undefined || data.project_role_id !== undefined)) {
    await recalculateRoleFilled(roleId, supabase)
  }
  // If the role link changed, also recalculate the old role
  if (allocation?.project_role_id && data.project_role_id !== undefined && data.project_role_id !== allocation.project_role_id) {
    await recalculateRoleFilled(allocation.project_role_id, supabase)
  }

  revalidatePath("/timeline")
  revalidatePath("/staffing")
  if (allocation?.project_id) {
    revalidatePath(`/projects/${allocation.project_id}`)
  }
}

export async function deleteAllocation(id: string) {
  const supabase = await createClient()

  // Get the allocation before deleting to sync back to role
  const { data: allocation } = await supabase
    .from("allocations")
    .select("project_role_id, project_id")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("allocations").delete().eq("id", id)

  if (error) throw error

  // If linked to a project role, recalculate whether it's still filled
  if (allocation?.project_role_id) {
    await recalculateRoleFilled(allocation.project_role_id, supabase)
  }

  revalidatePath("/timeline")
  revalidatePath("/staffing")
  if (allocation?.project_id) {
    revalidatePath(`/projects/${allocation.project_id}`)
  }
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
