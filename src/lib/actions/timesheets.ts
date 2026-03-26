"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { TimeEntry, TimesheetPeriod, Profile } from "@/lib/types/database"
import { startOfWeek, endOfWeek, format } from "date-fns"

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

// ---------------------------------------------------------------------------
// Time Entries
// ---------------------------------------------------------------------------

export async function getTimeEntries(profileId: string, weekStart: string) {
  const { supabase } = await getAuthInfo()

  const weekEnd = format(
    endOfWeek(new Date(weekStart), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  )

  const { data, error } = await supabase
    .from("time_entries")
    .select("*, project:projects(id, name, color, is_billable)")
    .eq("profile_id", profileId)
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .order("date")

  if (error) throw error

  return (data ?? []) as (TimeEntry & {
    project: { id: string; name: string; color: string; is_billable: boolean } | null
  })[]
}

export async function getPlannedHours(profileId: string, weekStart: string) {
  const { supabase } = await getAuthInfo()

  const weekEnd = format(
    endOfWeek(new Date(weekStart), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  )

  const { data, error } = await supabase
    .from("allocations")
    .select("*, project:projects(id, name, color, is_billable)")
    .eq("profile_id", profileId)
    .lte("start_date", weekEnd)
    .gte("end_date", weekStart)

  if (error) throw error

  return (data ?? []) as {
    id: string
    project_id: string
    hours_per_day: number
    start_date: string
    end_date: string
    project: { id: string; name: string; color: string; is_billable: boolean } | null
  }[]
}

export async function upsertTimeEntry(data: {
  id?: string
  profile_id: string
  project_id: string
  date: string
  hours: number
  description?: string | null
  is_billable?: boolean
  phase_id?: string | null
}) {
  const { supabase, organizationId } = await getAuthInfo()

  if (data.id) {
    // Update
    const { error } = await supabase
      .from("time_entries")
      .update({
        hours: data.hours,
        description: data.description ?? null,
        is_billable: data.is_billable ?? true,
        phase_id: data.phase_id ?? null,
      })
      .eq("id", data.id)

    if (error) throw error
  } else {
    // Insert
    const { error } = await supabase.from("time_entries").insert({
      organization_id: organizationId,
      profile_id: data.profile_id,
      project_id: data.project_id,
      date: data.date,
      hours: data.hours,
      description: data.description ?? null,
      is_billable: data.is_billable ?? true,
      phase_id: data.phase_id ?? null,
    })

    if (error) throw error
  }

  revalidatePath("/timesheets")
}

export async function deleteTimeEntry(id: string) {
  const { supabase } = await getAuthInfo()

  const { error } = await supabase.from("time_entries").delete().eq("id", id)

  if (error) throw error

  revalidatePath("/timesheets")
}

// ---------------------------------------------------------------------------
// Timesheet Periods
// ---------------------------------------------------------------------------

export async function getTimesheetPeriod(
  profileId: string,
  weekStart: string
): Promise<TimesheetPeriod | null> {
  const { supabase } = await getAuthInfo()

  const { data, error } = await supabase
    .from("timesheet_periods")
    .select("*")
    .eq("profile_id", profileId)
    .eq("week_start", weekStart)
    .maybeSingle()

  if (error) throw error

  return data as TimesheetPeriod | null
}

export async function submitTimesheet(profileId: string, weekStart: string) {
  const { supabase } = await getAuthInfo()

  // Check if period exists
  const { data: existing } = await supabase
    .from("timesheet_periods")
    .select("id, status")
    .eq("profile_id", profileId)
    .eq("week_start", weekStart)
    .maybeSingle()

  if (existing) {
    if (existing.status === "approved") {
      throw new Error("Timesheet already approved")
    }
    const { error } = await supabase
      .from("timesheet_periods")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", existing.id)

    if (error) throw error
  } else {
    const { error } = await supabase.from("timesheet_periods").insert({
      profile_id: profileId,
      week_start: weekStart,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })

    if (error) throw error
  }

  revalidatePath("/timesheets")
  revalidatePath("/timesheets/approval")
}

export async function approveTimesheet(timesheetId: string) {
  const { supabase, userId } = await getAuthInfo()

  const { error } = await supabase
    .from("timesheet_periods")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", timesheetId)

  if (error) throw error

  revalidatePath("/timesheets")
  revalidatePath("/timesheets/approval")
}

export async function rejectTimesheet(timesheetId: string, reason: string) {
  const { supabase } = await getAuthInfo()

  const { error } = await supabase
    .from("timesheet_periods")
    .update({
      status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", timesheetId)

  if (error) throw error

  revalidatePath("/timesheets")
  revalidatePath("/timesheets/approval")
}

export async function getPendingTimesheets() {
  const { supabase, organizationId } = await getAuthInfo()

  // Get all profiles in org
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, job_title")
    .eq("organization_id", organizationId)

  if (!profiles || profiles.length === 0) return []

  const profileIds = profiles.map((p) => p.id)
  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const { data: timesheets, error } = await supabase
    .from("timesheet_periods")
    .select("*")
    .in("profile_id", profileIds)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })

  if (error) throw error

  // For each timesheet, get total hours
  const result = []
  for (const ts of timesheets ?? []) {
    const weekEnd = format(
      endOfWeek(new Date(ts.week_start), { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    )

    const { data: entries } = await supabase
      .from("time_entries")
      .select("date, hours, project:projects(id, name)")
      .eq("profile_id", ts.profile_id)
      .gte("date", ts.week_start)
      .lte("date", weekEnd)

    const profile = profileMap.get(ts.profile_id)
    const totalHours = (entries ?? []).reduce((sum, e) => sum + e.hours, 0)

    result.push({
      ...ts,
      profile: profile as Pick<Profile, "id" | "full_name" | "avatar_url" | "job_title">,
      total_hours: totalHours,
      entries: (entries ?? []) as unknown as {
        date: string
        hours: number
        project: { id: string; name: string } | null
      }[],
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Current user helper
// ---------------------------------------------------------------------------

export async function getCurrentProfileId(): Promise<string> {
  const { userId } = await getAuthInfo()
  return userId
}

export async function getUserProjects(profileId: string) {
  const { supabase, organizationId } = await getAuthInfo()

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, color, is_billable")
    .eq("organization_id", organizationId)
    .in("status", ["confirmed", "in_progress"])
    .order("name")

  if (error) throw error

  return (data ?? []) as { id: string; name: string; color: string; is_billable: boolean }[]
}
