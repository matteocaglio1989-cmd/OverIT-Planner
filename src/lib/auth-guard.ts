"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { UserRole } from "@/lib/types/database"

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id, role, full_name, email")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  return {
    userId: profile.id,
    organizationId: profile.organization_id as string,
    role: profile.role as UserRole,
    fullName: profile.full_name,
    email: profile.email,
  }
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser()
  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/")
  }
  return user
}
