"use server"

import { createClient } from "@/lib/supabase/server"

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
  if (profile.role !== "admin" && profile.role !== "manager") {
    return { error: "Only admins can configure integrations" }
  }

  const updateData: Record<string, string> = {
    hibob_service_user_id: serviceUserId,
  }
  if (apiToken) {
    updateData.hibob_api_token = apiToken
  }

  const { error } = await supabase
    .from("organizations")
    .update(updateData)
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

  const { data: org, error } = await supabase
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
      if (response.status === 401) {
        return { error: "Invalid credentials. Please check your API token and service user ID." }
      }
      if (response.status === 403) {
        return { error: "Service user doesn't have API access. Please verify the service user has the required permissions in HiBob." }
      }
      return { error: `HiBob API returned ${response.status}: ${response.statusText}` }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message.includes("fetch failed") ||
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("ENOTFOUND") ||
        err.message.includes("network") ||
        err.message.includes("ETIMEDOUT")
      ) {
        return { error: "Cannot reach HiBob API. Please check your network connection and try again." }
      }
      return { error: err.message }
    }
    return { error: "Connection test failed" }
  }
}
