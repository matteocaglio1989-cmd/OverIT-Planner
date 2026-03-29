"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Profile, ProfileSkill } from "@/lib/types/database"

export async function getProfiles(): Promise<
  (Profile & { skills: { skill_id: string; skill_name: string; proficiency_level: number }[] })[]
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

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("full_name")

  if (error) throw error

  const profileIds = (profiles ?? []).map((p) => p.id)

  const { data: profileSkills } = await supabase
    .from("profile_skills")
    .select("profile_id, skill_id, proficiency_level, skills(name)")
    .in("profile_id", profileIds.length > 0 ? profileIds : ["__none__"])

  const skillsByProfile = new Map<
    string,
    { skill_id: string; skill_name: string; proficiency_level: number }[]
  >()

  for (const ps of profileSkills ?? []) {
    const list = skillsByProfile.get(ps.profile_id) ?? []
    list.push({
      skill_id: ps.skill_id,
      skill_name: (ps.skills as unknown as { name: string })?.name ?? "",
      proficiency_level: ps.proficiency_level,
    })
    skillsByProfile.set(ps.profile_id, list)
  }

  return (profiles ?? []).map((p) => ({
    ...p,
    skills: skillsByProfile.get(p.id) ?? [],
  }))
}

export async function getProfile(
  id: string
): Promise<
  | (Profile & {
      skills: { skill_id: string; skill_name: string; proficiency_level: number }[]
    })
  | null
> {
  const supabase = await createClient()

  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !profileData) return null

  const { data: profileSkills } = await supabase
    .from("profile_skills")
    .select("profile_id, skill_id, proficiency_level, skills(name)")
    .eq("profile_id", id)

  const skills = (profileSkills ?? []).map((ps) => ({
    skill_id: ps.skill_id,
    skill_name: (ps.skills as unknown as { name: string })?.name ?? "",
    proficiency_level: ps.proficiency_level,
  }))

  return { ...profileData, skills }
}

export async function updateProfile(
  id: string,
  data: Partial<
    Pick<
      Profile,
      | "full_name"
      | "email"
      | "job_title"
      | "department"
      | "seniority_level"
      | "role"
      | "cost_rate_hourly"
      | "default_bill_rate"
      | "location"
      | "country_code"
      | "weekly_capacity_hours"
    >
  >
) {
  const supabase = await createClient()

  const { error } = await supabase.from("profiles").update(data).eq("id", id)

  if (error) throw error

  revalidatePath("/people")
  revalidatePath(`/people/${id}`)
}

export async function addProfileSkill(
  profileId: string,
  skillId: string,
  proficiency: number
) {
  const supabase = await createClient()

  const { error } = await supabase.from("profile_skills").upsert({
    profile_id: profileId,
    skill_id: skillId,
    proficiency_level: proficiency,
  })

  if (error) throw error

  revalidatePath("/people")
  revalidatePath(`/people/${profileId}`)
}

export async function addSkillToProfile(
  profileId: string,
  skillName: string
): Promise<{ skill_id: string; skill_name: string }> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  const trimmed = skillName.trim()
  if (!trimmed) throw new Error("Skill name cannot be empty")

  // Check if skill already exists in the org (case-insensitive)
  const { data: existingSkills } = await supabase
    .from("skills")
    .select("id, name")
    .eq("organization_id", profile.organization_id)
    .ilike("name", trimmed)

  let skillId: string
  let finalName: string

  if (existingSkills && existingSkills.length > 0) {
    skillId = existingSkills[0].id
    finalName = existingSkills[0].name
  } else {
    // Auto-create the skill
    const { data: newSkill, error: createError } = await supabase
      .from("skills")
      .insert({
        organization_id: profile.organization_id,
        name: trimmed,
        category: null,
      })
      .select("id, name")
      .single()

    if (createError || !newSkill) throw createError ?? new Error("Failed to create skill")

    skillId = newSkill.id
    finalName = newSkill.name
  }

  // Link skill to profile (default proficiency 3)
  const { error: linkError } = await supabase.from("profile_skills").upsert({
    profile_id: profileId,
    skill_id: skillId,
    proficiency_level: 3,
  })

  if (linkError) throw linkError

  revalidatePath("/people")
  revalidatePath(`/people/${profileId}`)
  revalidatePath("/settings/skills")

  return { skill_id: skillId, skill_name: finalName }
}

export async function removeProfileSkill(profileId: string, skillId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("profile_skills")
    .delete()
    .eq("profile_id", profileId)
    .eq("skill_id", skillId)

  if (error) throw error

  revalidatePath("/people")
  revalidatePath(`/people/${profileId}`)
}
