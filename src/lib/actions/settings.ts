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
  const supabase = await createClient()

  // Get current user's org
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return { error: "No organization found" }

  // Check if user already exists in the org
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("organization_id", profile.organization_id)
    .single()

  if (existing) {
    return { error: `${email} is already a member of this organization.` }
  }

  // Use Supabase Admin API to invite the user
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const adminClient = createAdminClient()

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: email.split("@")[0],
        invited_role: role,
        organization_id: profile.organization_id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace("supabase.co", "vercel.app") : ""}/auth/callback`,
    })

    if (inviteError) {
      // If user already exists in auth but not in org, add them
      if (inviteError.message?.includes("already been registered") || inviteError.message?.includes("already exists")) {
        // Look up user by email via admin
        const { data: listData } = await adminClient.auth.admin.listUsers()
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (existingUser) {
          // Create profile in this org
          await adminClient.from("profiles").upsert({
            id: existingUser.id,
            email: email.toLowerCase(),
            full_name: existingUser.user_metadata?.full_name || email.split("@")[0],
            organization_id: profile.organization_id,
            role,
          })

          revalidatePath("/settings")
          return { success: true, message: `${email} added to your organization as ${role}.` }
        }

        return { error: `User ${email} already registered but could not be added. Please contact support.` }
      }

      return { error: inviteError.message }
    }

    // Create profile for the invited user
    if (inviteData?.user) {
      await adminClient.from("profiles").upsert({
        id: inviteData.user.id,
        email: email.toLowerCase(),
        full_name: email.split("@")[0],
        organization_id: profile.organization_id,
        role,
      })
    }

    revalidatePath("/settings")
    return { success: true, message: `Invitation email sent to ${email} as ${role}.` }
  } catch (err) {
    // Fallback if SUPABASE_SERVICE_ROLE_KEY is not configured
    if (err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        error: "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to your environment variables to enable invitations.",
      }
    }
    return { error: err instanceof Error ? err.message : "Failed to send invitation." }
  }
}
