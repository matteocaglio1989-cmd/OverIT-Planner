"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Skill } from "@/lib/types/database"

export async function getSkills(): Promise<Skill[]> {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("category")
    .order("name")

  if (error) throw error

  return data ?? []
}

export async function createSkill(name: string, category: string | null) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  const { error } = await supabase.from("skills").insert({
    organization_id: profile.organization_id,
    name,
    category,
  })

  if (error) throw error

  revalidatePath("/settings/skills")
}

export async function updateSkill(
  id: string,
  name: string,
  category: string | null
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("skills")
    .update({ name, category })
    .eq("id", id)

  if (error) throw error

  revalidatePath("/settings/skills")
}

export async function deleteSkill(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("skills").delete().eq("id", id)

  if (error) throw error

  revalidatePath("/settings/skills")
}
