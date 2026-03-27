"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { PendingInvite } from "@/lib/types/database"

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return []

  const { data, error } = await supabase
    .from("pending_invites")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("status", "pending")
    .order("invited_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch pending invites:", error)
    return []
  }

  return (data ?? []) as PendingInvite[]
}

export async function cancelInvite(inviteId: string) {
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
    .from("pending_invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId)
    .eq("organization_id", profile.organization_id)

  if (error) return { error: error.message }

  revalidatePath("/settings")
  revalidatePath("/people")
  return { success: true }
}

export async function resendInvite(inviteId: string) {
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

  // Get the invite details
  const { data: invite } = await supabase
    .from("pending_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("organization_id", profile.organization_id)
    .single()

  if (!invite) return { error: "Invite not found" }

  // Re-send the invitation via Supabase Admin API
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const adminClient = createAdminClient()

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(invite.email, {
      data: {
        full_name: invite.email.split("@")[0],
        invited_role: invite.role,
        organization_id: profile.organization_id,
      },
    })

    if (inviteError) {
      // If the user already exists, that's okay - the original invite is still valid
      if (!inviteError.message?.includes("already") ) {
        return { error: inviteError.message }
      }
    }

    // Update invited_at timestamp
    await supabase
      .from("pending_invites")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", inviteId)

    revalidatePath("/settings")
    return { success: true, message: `Invitation resent to ${invite.email}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to resend invitation." }
  }
}
