"use server"

import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// HiBob Config Management
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HiBob API helpers
// ---------------------------------------------------------------------------

const HIBOB_PEOPLE_SEARCH_URL = "https://api.hibob.com/v1/people/search"
const HIBOB_TIMEOFF_URL = "https://api.hibob.com/v1/timeoff/whosout"

function hibobAuthHeader(serviceUserId: string, apiToken: string) {
  return `Basic ${Buffer.from(`${serviceUserId}:${apiToken}`).toString("base64")}`
}

async function callHiBob(
  url: string,
  method: "GET" | "POST",
  serviceUserId: string,
  apiToken: string,
  body?: Record<string, unknown>
): Promise<{ data?: unknown; error?: string }> {
  try {
    const headers: Record<string, string> = {
      Authorization: hibobAuthHeader(serviceUserId, apiToken),
      Accept: "application/json",
    }
    const options: RequestInit = { method, headers }

    if (body) {
      headers["Content-Type"] = "application/json"
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errText = await response.text().catch(() => "")
      if (response.status === 401) {
        return { error: "Invalid credentials (401). Please check your Service User ID and API Token." }
      }
      if (response.status === 403) {
        return { error: "Access denied (403). The service user doesn't have the required API permissions in HiBob." }
      }
      if (response.status === 404) {
        return { error: `HiBob API endpoint not found (404). URL: ${url}` }
      }
      return { error: `HiBob API error ${response.status}: ${errText.slice(0, 300)}` }
    }

    const responseText = await response.text()

    // Check for HTML response (redirect to login page)
    if (responseText.trimStart().startsWith("<")) {
      return { error: "HiBob returned HTML instead of JSON. Your API token may be expired. Generate a new one in HiBob (Settings > Integrations > Service Users)." }
    }

    try {
      return { data: JSON.parse(responseText) }
    } catch {
      return { error: `Invalid JSON from HiBob. Response: "${responseText.slice(0, 200)}..."` }
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED") || err.message.includes("ENOTFOUND") || err.message.includes("ETIMEDOUT")) {
        return { error: "Cannot reach HiBob API. Please check your network connection." }
      }
      return { error: `Network error: ${err.message}` }
    }
    return { error: "Unknown error calling HiBob API" }
  }
}

// ---------------------------------------------------------------------------
// Test Connection
// ---------------------------------------------------------------------------

export async function testHiBobConnection(serviceUserId: string, apiToken: string) {
  if (!apiToken || !serviceUserId) {
    return { error: "API token and service user ID are required" }
  }

  // Use the new POST /v1/people/search endpoint (GET /v1/people was deprecated April 2025)
  const result = await callHiBob(
    HIBOB_PEOPLE_SEARCH_URL,
    "POST",
    serviceUserId,
    apiToken,
    {
      fields: ["root.email"],
      showInactive: false,
    }
  )

  if (result.error) return { error: result.error }
  return { success: true }
}

// ---------------------------------------------------------------------------
// Preview People (for import flow)
// ---------------------------------------------------------------------------

interface PreviewEmployee {
  hibobId: string
  email: string
  fullName: string
  jobTitle: string
  department: string
  startDate: string
  location: string
  isDuplicate: boolean
  hasChanges: boolean
  existingProfileId: string | null
  roleExists: boolean
  selected: boolean
}

export async function previewHiBobPeople() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return { error: "No organization" }
  const organizationId = profile.organization_id

  const { data: org } = await supabase
    .from("organizations")
    .select("hibob_service_user_id, hibob_api_token")
    .eq("id", organizationId)
    .single()

  const apiToken = org?.hibob_api_token
  const serviceUserId = org?.hibob_service_user_id

  if (!apiToken || !serviceUserId) {
    return { error: "HiBob credentials not configured. Please save your API credentials first." }
  }

  // Use POST /v1/people/search (the new endpoint)
  const result = await callHiBob(
    HIBOB_PEOPLE_SEARCH_URL,
    "POST",
    serviceUserId,
    apiToken,
    {
      fields: [
        "root.id",
        "root.email",
        "root.displayName",
        "root.firstName",
        "root.surname",
        "work.title",
        "work.department",
        "work.startDate",
        "work.site",
      ],
      showInactive: false,
      humanReadable: "REPLACE",
    }
  )

  if (result.error) return { error: result.error }

  const hibobData = result.data as Record<string, unknown>
  const employees = (hibobData.employees as Record<string, unknown>[]) || []

  // Get existing profiles and role definitions
  const [{ data: existingProfiles }, { data: roleDefinitions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, job_title, department")
      .eq("organization_id", organizationId),
    supabase
      .from("role_definitions")
      .select("id, name, default_bill_rate")
      .eq("organization_id", organizationId),
  ])

  const existingByEmail = new Map(
    (existingProfiles || []).map((p) => [p.email.toLowerCase(), p])
  )
  const roleDefNames = new Set((roleDefinitions || []).map((r) => r.name.toLowerCase()))

  // Parse employee data from the search API response
  const preview: PreviewEmployee[] = employees.map((emp) => {
    // The search API returns fields directly on the employee object
    const email = ((emp.email as string) || "").toLowerCase()
    const fullName = (emp.displayName as string) ||
      `${(emp.firstName as string) || ""} ${(emp.surname as string) || ""}`.trim()

    // Work fields may be nested or flat depending on humanReadable setting
    const work = emp.work as Record<string, unknown> | undefined
    const jobTitle = (work?.title as string) || (emp["work.title"] as string) || ""
    const department = (work?.department as string) || (emp["work.department"] as string) || ""
    const startDate = (work?.startDate as string) || (emp["work.startDate"] as string) || ""
    const location = (work?.site as string) || (emp["work.site"] as string) || ""

    const existing = email ? existingByEmail.get(email) : null
    const isDuplicate = !!existing
    const hasChanges = isDuplicate && (
      existing.full_name !== fullName ||
      existing.job_title !== jobTitle ||
      existing.department !== department
    )
    const roleExists = jobTitle ? roleDefNames.has(jobTitle.toLowerCase()) : true

    return {
      hibobId: (emp.id as string) || "",
      email,
      fullName,
      jobTitle,
      department,
      startDate,
      location,
      isDuplicate,
      hasChanges,
      existingProfileId: existing?.id || null,
      roleExists,
      selected: !isDuplicate || hasChanges,
    }
  }).filter((p) => p.email)

  const missingRoles = Array.from(
    new Set(preview.filter((p) => p.jobTitle && !p.roleExists).map((p) => p.jobTitle))
  )

  return {
    employees: preview,
    missingRoles,
    roleDefinitions: roleDefinitions || [],
    totalInHiBob: employees.length,
  }
}

// ---------------------------------------------------------------------------
// Sync People (import selected employees)
// ---------------------------------------------------------------------------

interface SyncEmployee {
  hibobId: string
  email: string
  fullName: string
  jobTitle: string
  department: string
  startDate: string
  location: string
  isDuplicate: boolean
  existingProfileId: string | null
}

interface RoleMapping {
  hibobTitle: string
  appRoleId: string | null
  appRoleName: string
  defaultBillRate: number | null
}

export async function syncHiBobPeople(
  selectedEmployees: SyncEmployee[],
  roleMappings: RoleMapping[],
  createMissingRoles: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return { error: "No organization" }
  const organizationId = profile.organization_id

  const log: { action: string; count: number; status: string }[] = []

  // Step 1: Create missing role definitions
  if (createMissingRoles && roleMappings.length > 0) {
    let rolesCreated = 0
    for (const mapping of roleMappings) {
      if (!mapping.appRoleId) {
        const { error } = await supabase.from("role_definitions").insert({
          organization_id: organizationId,
          name: mapping.appRoleName || mapping.hibobTitle,
          default_bill_rate: mapping.defaultBillRate,
        })
        if (!error) rolesCreated++
      }
    }
    if (rolesCreated > 0) log.push({ action: "Role definitions created", count: rolesCreated, status: "success" })
  }

  // Step 2: Update existing profiles
  let updated = 0
  for (const emp of selectedEmployees.filter((e) => e.isDuplicate && e.existingProfileId)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: emp.fullName,
        job_title: emp.jobTitle || null,
        department: emp.department || null,
        start_date: emp.startDate || null,
        location: emp.location || null,
      })
      .eq("id", emp.existingProfileId!)
    if (!error) updated++
  }
  if (updated > 0) log.push({ action: "Existing profiles updated", count: updated, status: "success" })

  // Step 3: New employees (need invitation)
  const newEmployees = selectedEmployees.filter((e) => !e.isDuplicate)
  if (newEmployees.length > 0) log.push({ action: "New people (need invitation)", count: newEmployees.length, status: "success" })

  // Step 4: Sync time-off / absences
  const { data: org } = await supabase
    .from("organizations")
    .select("hibob_service_user_id, hibob_api_token")
    .eq("id", organizationId)
    .single()

  if (org?.hibob_api_token && org?.hibob_service_user_id) {
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]
    const endOfYear = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0]

    const timeoffResult = await callHiBob(
      `${HIBOB_TIMEOFF_URL}?from=${startOfYear}&to=${endOfYear}`,
      "GET",
      org.hibob_service_user_id,
      org.hibob_api_token
    )

    if (timeoffResult.data) {
      const timeoffData = timeoffResult.data as Record<string, unknown>
      let absencesCreated = 0
      const selectedEmails = new Set(selectedEmployees.map((e) => e.email.toLowerCase()))

      for (const out of ((timeoffData.outs as Record<string, unknown>[]) || [])) {
        const empEmail = ((out.employeeEmail as string) || "").toLowerCase()
        if (!empEmail || !selectedEmails.has(empEmail)) continue

        const { data: match } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", empEmail)
          .eq("organization_id", organizationId)
          .single()

        if (!match) continue

        const { error: absErr } = await supabase.from("absences").upsert({
          profile_id: match.id,
          start_date: out.startDate as string,
          end_date: out.endDate as string,
          type: (out.policyTypeDisplayName as string) || "vacation",
          description: `Synced from HiBob: ${(out.policyTypeDisplayName as string) || "Time off"}`,
          is_approved: true,
        }, { onConflict: "profile_id,start_date,end_date", ignoreDuplicates: true })

        if (!absErr) absencesCreated++
      }
      if (absencesCreated > 0) log.push({ action: "Absences synced", count: absencesCreated, status: "success" })
    } else if (timeoffResult.error) {
      log.push({ action: "Absences sync failed", count: 0, status: "error" })
    }
  }

  return { success: true, employeeCount: selectedEmployees.length, log }
}
