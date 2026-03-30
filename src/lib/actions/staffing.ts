"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Profile, ProjectRole, Project } from "@/lib/types/database"

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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Calculate the total allocated FTE for a given project role by summing
 * all allocations' hours_per_day / 8.
 */
export async function calculateAllocatedFte(
  roleId: string,
  supabaseClient?: SupabaseClient
): Promise<number> {
  const client = supabaseClient ?? (await createClient())

  const { data: allocations, error } = await client
    .from("allocations")
    .select("hours_per_day")
    .eq("project_role_id", roleId)

  if (error) throw error

  const totalHoursPerDay = (allocations ?? []).reduce(
    (sum, a) => sum + a.hours_per_day,
    0
  )

  return Math.round((totalHoursPerDay / 8) * 100) / 100
}

/**
 * Recalculate whether a role is filled based on the sum of its allocations
 * vs the role's FTE requirement.
 */
export async function recalculateRoleFilled(
  roleId: string,
  supabaseClient?: SupabaseClient
): Promise<{ allocatedFte: number; isFilled: boolean }> {
  const client = supabaseClient ?? (await createClient())

  const allocatedFte = await calculateAllocatedFte(roleId, client)

  // Get the role's required FTE
  const { data: role, error } = await client
    .from("project_roles")
    .select("fte")
    .eq("id", roleId)
    .single()

  if (error || !role) throw error ?? new Error("Role not found")

  const requiredFte = role.fte ?? 1.0
  const isFilled = allocatedFte >= requiredFte

  // Update the role's is_filled status (don't touch assigned_profile_id since multiple people can fill one role)
  await client
    .from("project_roles")
    .update({ is_filled: isFilled })
    .eq("id", roleId)

  return { allocatedFte, isFilled }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsultantWithAllocation extends Profile {
  allocation_percentage: number
  allocated_hours_per_week: number
  skills: { id: string; name: string; proficiency_level: number }[]
}

export interface OpenRoleWithProject extends ProjectRole {
  project: Pick<Project, "id" | "name" | "status" | "start_date" | "end_date" | "color">
  allocated_fte: number
  remaining_fte: number
}

export interface SkillMatch {
  profile: Profile
  match_percentage: number
  matched_skills: string[]
  missing_skills: string[]
  allocation_percentage: number
  skills: { id: string; name: string; proficiency_level: number }[]
}

// ---------------------------------------------------------------------------
// Available Consultants
// ---------------------------------------------------------------------------

export async function getAvailableConsultants(): Promise<ConsultantWithAllocation[]> {
  const { supabase, organizationId } = await getOrgId()

  // Fetch active profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("full_name")

  if (profilesError) throw profilesError
  if (!profiles || profiles.length === 0) return []

  const today = new Date().toISOString().split("T")[0]

  // Fetch current allocations for all profiles
  const { data: allocations, error: allocError } = await supabase
    .from("allocations")
    .select("profile_id, hours_per_day")
    .eq("organization_id", organizationId)
    .lte("start_date", today)
    .gte("end_date", today)

  if (allocError) throw allocError

  // Fetch skills for all profiles
  const profileIds = profiles.map((p) => p.id)
  const { data: profileSkills, error: skillsError } = await supabase
    .from("profile_skills")
    .select("profile_id, skill_id, proficiency_level, skill:skills(id, name)")
    .in("profile_id", profileIds)

  if (skillsError) throw skillsError

  // Build allocation map: profile_id -> total hours_per_day
  const allocationMap = new Map<string, number>()
  for (const alloc of allocations ?? []) {
    const current = allocationMap.get(alloc.profile_id) ?? 0
    allocationMap.set(alloc.profile_id, current + alloc.hours_per_day)
  }

  // Build skills map
  const skillsMap = new Map<string, { id: string; name: string; proficiency_level: number }[]>()
  for (const ps of profileSkills ?? []) {
    const skill = ps.skill as unknown as { id: string; name: string } | null
    if (!skill) continue
    const existing = skillsMap.get(ps.profile_id) ?? []
    existing.push({
      id: skill.id,
      name: skill.name,
      proficiency_level: ps.proficiency_level,
    })
    skillsMap.set(ps.profile_id, existing)
  }

  // Combine and calculate utilization
  const result: ConsultantWithAllocation[] = profiles.map((profile) => {
    const allocatedHoursPerDay = allocationMap.get(profile.id) ?? 0
    const weeklyCapacity = profile.weekly_capacity_hours || 40
    const dailyCapacity = weeklyCapacity / 5
    const allocationPercentage =
      dailyCapacity > 0 ? Math.round((allocatedHoursPerDay / dailyCapacity) * 100) : 0
    const allocatedHoursPerWeek = allocatedHoursPerDay * 5

    return {
      ...profile,
      allocation_percentage: allocationPercentage,
      allocated_hours_per_week: allocatedHoursPerWeek,
      skills: skillsMap.get(profile.id) ?? [],
    } as ConsultantWithAllocation
  })

  // Sort by least utilized first (most available)
  result.sort((a, b) => a.allocation_percentage - b.allocation_percentage)

  return result
}

// ---------------------------------------------------------------------------
// Open Roles
// ---------------------------------------------------------------------------

export async function getOpenRoles(): Promise<OpenRoleWithProject[]> {
  const { supabase, organizationId } = await getOrgId()

  // Fetch projects for the org first, then get roles
  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("id, name, status, start_date, end_date, color")
    .eq("organization_id", organizationId)
    .in("status", ["tentative", "confirmed", "in_progress"])

  if (projError) throw projError
  if (!projects || projects.length === 0) return []

  const projectIds = projects.map((p) => p.id)

  // Fetch ALL roles (not just is_filled=false) so we can check partial fills
  const { data: roles, error: rolesError } = await supabase
    .from("project_roles")
    .select("*")
    .in("project_id", projectIds)
    .order("title")

  if (rolesError) throw rolesError
  if (!roles || roles.length === 0) return []

  // Fetch all allocations linked to these roles to calculate allocated FTE
  const roleIds = roles.map((r) => r.id)
  const { data: allocations, error: allocError } = await supabase
    .from("allocations")
    .select("project_role_id, hours_per_day")
    .in("project_role_id", roleIds)

  if (allocError) throw allocError

  // Build a map of role_id -> total allocated hours_per_day
  const roleAllocMap = new Map<string, number>()
  for (const alloc of allocations ?? []) {
    if (!alloc.project_role_id) continue
    const current = roleAllocMap.get(alloc.project_role_id) ?? 0
    roleAllocMap.set(alloc.project_role_id, current + alloc.hours_per_day)
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  // Filter to roles where allocated FTE < required FTE
  const openRoles: OpenRoleWithProject[] = []
  for (const role of roles) {
    const totalHoursPerDay = roleAllocMap.get(role.id) ?? 0
    const allocatedFte = Math.round((totalHoursPerDay / 8) * 100) / 100
    const requiredFte = role.fte ?? 1.0
    const remainingFte = Math.round(Math.max(0, requiredFte - allocatedFte) * 100) / 100

    if (remainingFte > 0) {
      openRoles.push({
        ...role,
        project: projectMap.get(role.project_id)!,
        allocated_fte: allocatedFte,
        remaining_fte: remainingFte,
      } as OpenRoleWithProject)
    }
  }

  return openRoles
}

// ---------------------------------------------------------------------------
// Skill Matching
// ---------------------------------------------------------------------------

export async function getSkillMatches(roleId: string): Promise<SkillMatch[]> {
  const { supabase, organizationId } = await getOrgId()

  // Get the role and its required skills
  const { data: role, error: roleError } = await supabase
    .from("project_roles")
    .select("*")
    .eq("id", roleId)
    .single()

  if (roleError || !role) throw roleError ?? new Error("Role not found")

  const requiredSkills = role.required_skills ?? []
  if (requiredSkills.length === 0) {
    // If no required skills, return all available consultants with 100% match
    const consultants = await getAvailableConsultants()
    return consultants.map((c) => ({
      profile: c,
      match_percentage: 100,
      matched_skills: [],
      missing_skills: [],
      allocation_percentage: c.allocation_percentage,
      skills: c.skills,
    }))
  }

  // Fetch all skills to map names to IDs
  const { data: allSkills } = await supabase
    .from("skills")
    .select("id, name")
    .eq("organization_id", organizationId)

  const skillNameToId = new Map((allSkills ?? []).map((s) => [s.name.toLowerCase(), s.id]))
  const skillIdToName = new Map((allSkills ?? []).map((s) => [s.id, s.name]))

  // Map required skill names to IDs
  const requiredSkillIds = requiredSkills
    .map((name: string) => skillNameToId.get(name.toLowerCase()))
    .filter(Boolean) as string[]

  // Fetch active profiles with their skills
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)

  if (profilesError) throw profilesError
  if (!profiles || profiles.length === 0) return []

  const profileIds = profiles.map((p) => p.id)

  const { data: profileSkills } = await supabase
    .from("profile_skills")
    .select("profile_id, skill_id, proficiency_level, skill:skills(id, name)")
    .in("profile_id", profileIds)

  // Build profile skills map
  const profileSkillsMap = new Map<
    string,
    { id: string; name: string; proficiency_level: number }[]
  >()
  for (const ps of profileSkills ?? []) {
    const skill = ps.skill as unknown as { id: string; name: string } | null
    if (!skill) continue
    const existing = profileSkillsMap.get(ps.profile_id) ?? []
    existing.push({
      id: skill.id,
      name: skill.name,
      proficiency_level: ps.proficiency_level,
    })
    profileSkillsMap.set(ps.profile_id, existing)
  }

  // Get current allocations
  const today = new Date().toISOString().split("T")[0]
  const { data: allocations } = await supabase
    .from("allocations")
    .select("profile_id, hours_per_day")
    .eq("organization_id", organizationId)
    .lte("start_date", today)
    .gte("end_date", today)

  const allocationMap = new Map<string, number>()
  for (const alloc of allocations ?? []) {
    const current = allocationMap.get(alloc.profile_id) ?? 0
    allocationMap.set(alloc.profile_id, current + alloc.hours_per_day)
  }

  // Calculate matches
  const matches: SkillMatch[] = []
  for (const profile of profiles) {
    const skills = profileSkillsMap.get(profile.id) ?? []
    const profileSkillIds = new Set(skills.map((s) => s.id))

    const matchedSkillIds = requiredSkillIds.filter((id) => profileSkillIds.has(id))
    const missingSkillIds = requiredSkillIds.filter((id) => !profileSkillIds.has(id))

    const matchPercentage =
      requiredSkillIds.length > 0
        ? Math.round((matchedSkillIds.length / requiredSkillIds.length) * 100)
        : 100

    // Only include if at least some match
    if (matchPercentage > 0) {
      const allocatedHoursPerDay = allocationMap.get(profile.id) ?? 0
      const dailyCapacity = (profile.weekly_capacity_hours || 40) / 5
      const allocationPercentage =
        dailyCapacity > 0 ? Math.round((allocatedHoursPerDay / dailyCapacity) * 100) : 0

      matches.push({
        profile,
        match_percentage: matchPercentage,
        matched_skills: matchedSkillIds.map((id) => skillIdToName.get(id) ?? id),
        missing_skills: missingSkillIds.map((id) => skillIdToName.get(id) ?? id),
        allocation_percentage: allocationPercentage,
        skills,
      })
    }
  }

  // Sort by match percentage desc, then by utilization asc
  matches.sort((a, b) => {
    if (b.match_percentage !== a.match_percentage) {
      return b.match_percentage - a.match_percentage
    }
    return a.allocation_percentage - b.allocation_percentage
  })

  return matches
}

// ---------------------------------------------------------------------------
// Availability for Date Range
// ---------------------------------------------------------------------------

export async function getAvailabilityForDateRange(
  profileId: string,
  startDate: string,
  endDate: string
): Promise<{ usedFte: number; availableFte: number }> {
  const { supabase, organizationId } = await getOrgId()

  // Fetch allocations that overlap with the given date range
  const { data: allocations, error } = await supabase
    .from("allocations")
    .select("hours_per_day")
    .eq("profile_id", profileId)
    .eq("organization_id", organizationId)
    .lte("start_date", endDate)
    .gte("end_date", startDate)

  if (error) throw error

  const totalHoursPerDay = (allocations ?? []).reduce(
    (sum, a) => sum + a.hours_per_day,
    0
  )

  // 1 FTE = 8 hours/day
  const usedFte = totalHoursPerDay / 8
  const availableFte = Math.max(0, 1.0 - usedFte)

  return { usedFte: Math.round(usedFte * 100) / 100, availableFte: Math.round(availableFte * 100) / 100 }
}

/**
 * Batch version: fetch availability for multiple profiles in a single query.
 */
export async function getBatchAvailabilityForDateRange(
  profileIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, { usedFte: number; availableFte: number }>> {
  if (profileIds.length === 0) return {}

  const { supabase, organizationId } = await getOrgId()

  const { data: allocations, error } = await supabase
    .from("allocations")
    .select("profile_id, hours_per_day")
    .in("profile_id", profileIds)
    .eq("organization_id", organizationId)
    .lte("start_date", endDate)
    .gte("end_date", startDate)

  if (error) throw error

  // Build per-profile totals
  const hoursMap = new Map<string, number>()
  for (const alloc of allocations ?? []) {
    const current = hoursMap.get(alloc.profile_id) ?? 0
    hoursMap.set(alloc.profile_id, current + alloc.hours_per_day)
  }

  const result: Record<string, { usedFte: number; availableFte: number }> = {}
  for (const id of profileIds) {
    const totalHoursPerDay = hoursMap.get(id) ?? 0
    const usedFte = totalHoursPerDay / 8
    const availableFte = Math.max(0, 1.0 - usedFte)
    result[id] = {
      usedFte: Math.round(usedFte * 100) / 100,
      availableFte: Math.round(availableFte * 100) / 100,
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Quick Assign
// ---------------------------------------------------------------------------

export async function quickAssign(
  profileId: string,
  roleId: string,
  startDate: string,
  endDate: string,
  allocationPercentage: number = 100
) {
  const { supabase, organizationId } = await getOrgId()

  // Get role details
  const { data: role, error: roleError } = await supabase
    .from("project_roles")
    .select("*")
    .eq("id", roleId)
    .single()

  if (roleError || !role) throw roleError ?? new Error("Role not found")

  // Use role-specific dates if available, otherwise use provided dates
  const effectiveStartDate = role.start_date || startDate
  const effectiveEndDate = role.end_date || endDate

  // Use FTE to calculate hours_per_day, scaled by allocation percentage
  // hours_per_day = role.fte * 8 * (percentage / 100)
  const fteValue = role.fte ?? 1.0
  const hoursPerDay = fteValue * 8 * (allocationPercentage / 100)

  // Create allocation
  const { error: allocError } = await supabase.from("allocations").insert({
    organization_id: organizationId,
    project_id: role.project_id,
    profile_id: profileId,
    project_role_id: roleId,
    start_date: effectiveStartDate,
    end_date: effectiveEndDate,
    hours_per_day: hoursPerDay,
    bill_rate: role.bill_rate,
    status: "confirmed",
  })

  if (allocError) throw allocError

  // Recalculate whether the role is now fully filled
  await recalculateRoleFilled(roleId, supabase)

  revalidatePath("/staffing")
  revalidatePath("/timeline")
  revalidatePath(`/projects/${role.project_id}`)
}
