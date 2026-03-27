import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const { organizationId } = await request.json()
    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userData.user.id)
      .single()

    if (!profile || profile.organization_id !== organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: org } = await admin
      .from("organizations")
      .select("hibob_service_user_id, hibob_api_token")
      .eq("id", organizationId)
      .single()

    const apiToken = org?.hibob_api_token
    const serviceUserId = org?.hibob_service_user_id

    if (!apiToken || !serviceUserId) {
      return NextResponse.json(
        { error: "HiBob credentials not configured. Please save your API credentials in the integration settings." },
        { status: 400 }
      )
    }

    // Fetch employees from HiBob
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
      return NextResponse.json(
        { error: `HiBob API error: ${hibobResponse.status} ${hibobResponse.statusText}` },
        { status: 502 }
      )
    }

    const hibobData = await hibobResponse.json()
    const employees = hibobData.employees || []

    // Get existing profiles
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("id, email, full_name, job_title, department")
      .eq("organization_id", organizationId)

    const existingByEmail = new Map(
      (existingProfiles || []).map((p) => [p.email.toLowerCase(), p])
    )

    // Get existing role definitions
    const { data: roleDefinitions } = await supabase
      .from("role_definitions")
      .select("id, name, default_bill_rate")
      .eq("organization_id", organizationId)

    const roleDefNames = new Set((roleDefinitions || []).map((r) => r.name.toLowerCase()))

    // Build preview list
    const preview = employees.map((emp: Record<string, unknown>) => {
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
        selected: !isDuplicate || hasChanges, // Pre-select new people and changed duplicates
      }
    }).filter((p: { email: string }) => p.email) // Skip entries without email

    // Collect unique job titles not yet in role definitions
    const missingRoles = Array.from(
      new Set(
        preview
          .filter((p: { jobTitle: string; roleExists: boolean }) => p.jobTitle && !p.roleExists)
          .map((p: { jobTitle: string }) => p.jobTitle)
      )
    )

    return NextResponse.json({
      employees: preview,
      missingRoles,
      roleDefinitions: roleDefinitions || [],
      totalInHiBob: employees.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preview failed" },
      { status: 500 }
    )
  }
}
