"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function saveHiBobConfig(serviceUserId: string, apiToken: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return { error: "No organization" }
  if (profile.role !== "admin" && profile.role !== "owner") {
    return { error: "Only admins can configure integrations" }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from("organizations")
    .update({
      hibob_service_user_id: serviceUserId,
      hibob_api_token: apiToken,
    })
    .eq("id", profile.organization_id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getHiBobConfig() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return { error: "No organization" }

  const admin = createAdminClient()

  const { data: org, error } = await admin
    .from("organizations")
    .select("hibob_service_user_id, hibob_api_token")
    .eq("id", profile.organization_id)
    .single()

  if (error) return { error: error.message }

  return {
    serviceUserId: org?.hibob_service_user_id || "",
    hasApiToken: !!org?.hibob_api_token,
  }
}

export async function testHiBobConnection(serviceUserId: string, apiToken: string) {
  if (!apiToken || !serviceUserId) {
    return { error: "API token and service user ID are required" }
  }

  try {
    const response = await fetch(
      "https://api.hibob.com/v1/people?showInactive=false&humanReadable=REPLACE",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${serviceUserId}:${apiToken}`).toString("base64")}`,
          Accept: "application/json",
        },
      }
    )

    if (!response.ok) {
      return { error: `HiBob API returned ${response.status}: ${response.statusText}` }
    }

    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Connection test failed" }
  }
}
