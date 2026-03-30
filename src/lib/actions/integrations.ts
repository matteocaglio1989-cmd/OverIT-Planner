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

// ---------------------------------------------------------------------------
// HiBob Preview & Sync (server actions replacing API routes)
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

  try {
    const hibobResponse = await fetch(
      "https://api.hibob.com/v1/people?showInactive=false&humanReadable=REPLACE",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${serviceUserId}:${apiToken}`).toString("base64")}`,
          Accept: "application/json",
        },
      }
    )

    if (!hibobResponse.ok) {
      if (hibobResponse.status === 401) return { error: "Invalid credentials. Please check your API token and service user ID." }
      if (hibobResponse.status === 403) return { error: "Service user doesn't have API access." }
      return { error: `HiBob API error: ${hibobResponse.status} ${hibobResponse.statusText}` }
    }

    const hibobData = await hibobResponse.json()
    const employees = hibobData.employees || []

    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, job_title, department")
      .eq("organization_id", organizationId)

    const existingByEmail = new Map(
      (existingProfiles || []).map((p) => [p.email.toLowerCase(), p])
    )

    const { data: roleDefinitions } = await supabase
      .from("role_definitions")
      .select("id, name, default_bill_rate")
      .eq("organization_id", organizationId)

    const roleDefNames = new Set((roleDefinitions || []).map((r) => r.name.toLowerCase()))

    const preview: PreviewEmployee[] = employees.map((emp: Record<string, unknown>) => {
      const email = (
        (emp.email as string) ||
        ((emp.personal as Record<string, unknown>)?.communication as Record<string, unknown>)?.workEmail as string ||
        ""
      ).toLowerCase()
      const work = emp.work as Record<string, unknown> | undefined
      const fullName = (emp.displayName as string) ||
        `${(emp.firstName as string) || ""} ${(emp.surname as string) || ""}`.trim()
      const jobTitle = (work?.title as string) || ""
      const department = (work?.department as string) || ""
      const startDate = (work?.startDate as string) || ""
      const location = (work?.site as string) || ""

      const existing = email ? existingByEmail.get(email) : null
      const isDuplicate = !!existing
      const hasChanges = isDuplicate && (
        existing.full_name !== fullName ||
        existing.job_title !== jobTitle ||
        existing.department !== department
      )
      const roleExists = jobTitle ? roleDefNames.has(jobTitle.toLowerCase()) : true

      return {
        hibobId: emp.id as string,
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
    }).filter((p: { email: string }) => p.email)

    const missingRoles = Array.from(
      new Set(
        preview
          .filter((p) => p.jobTitle && !p.roleExists)
          .map((p) => p.jobTitle)
      )
    )

    return {
      employees: preview,
      missingRoles,
      roleDefinitions: roleDefinitions || [],
      totalInHiBob: employees.length,
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("fetch failed") || err.message.includes("ECONNREFUSED") || err.message.includes("ENOTFOUND") || err.message.includes("ETIMEDOUT")) {
        return { error: "Cannot reach HiBob API. Please check your network connection." }
      }
      return { error: err.message }
    }
    return { error: "Preview failed" }
  }
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

  // Step 3: New employees
  const newEmployees = selectedEmployees.filter((e) => !e.isDuplicate)
  if (newEmployees.length > 0) log.push({ action: "New people (need invitation)", count: newEmployees.length, status: "success" })

  // Step 4: Sync time-off
  const { data: org } = await supabase
    .from("organizations")
    .select("hibob_service_user_id, hibob_api_token")
    .eq("id", organizationId)
    .single()

  if (org?.hibob_api_token && org?.hibob_service_user_id) {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]
      const endOfYear = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0]

      const timeoffResponse = await fetch(
        `https://api.hibob.com/v1/timeoff/whosout?from=${startOfYear}&to=${endOfYear}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${org.hibob_service_user_id}:${org.hibob_api_token}`).toString("base64")}`,
            Accept: "application/json",
          },
        }
      )

      if (timeoffResponse.ok) {
        const timeoffData = await timeoffResponse.json()
        let absencesCreated = 0
        const selectedEmails = new Set(selectedEmployees.map((e) => e.email.toLowerCase()))

        for (const out of (timeoffData.outs || [])) {
          const empEmail = (out.employeeEmail || "").toLowerCase()
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
            start_date: out.startDate,
            end_date: out.endDate,
            type: out.policyTypeDisplayName || "vacation",
            description: `Synced from HiBob: ${out.policyTypeDisplayName || "Time off"}`,
            is_approved: true,
          }, { onConflict: "profile_id,start_date,end_date", ignoreDuplicates: true })

          if (!absErr) absencesCreated++
        }
        if (absencesCreated > 0) log.push({ action: "Absences synced", count: absencesCreated, status: "success" })
      }
    } catch {
      log.push({ action: "Absences sync", count: 0, status: "error" })
    }
  }

  return { success: true, employeeCount: selectedEmployees.length, log }
}

// ---------------------------------------------------------------------------
// Test Connection
// ---------------------------------------------------------------------------

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
