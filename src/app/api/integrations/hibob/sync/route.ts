import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface HiBobEmployee {
  id: string
  email: string
  displayName: string
  firstName: string
  surname: string
  work?: {
    title?: string
    department?: string
    startDate?: string
    site?: string
    siteId?: number
  }
  personal?: {
    communication?: {
      workEmail?: string
    }
  }
}

export async function POST(request: Request) {
  try {
    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the user and verify they belong to the org
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", userData.user.id)
      .single()

    if (!profile || profile.organization_id !== organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get HiBob config from request headers or stored config
    // In production, this would come from an encrypted DB field
    // For now, the client passes the org ID and we use environment variables
    const apiToken = process.env.HIBOB_API_TOKEN
    const serviceUserId = process.env.HIBOB_SERVICE_USER_ID

    if (!apiToken || !serviceUserId) {
      return NextResponse.json(
        { error: "HiBob credentials not configured. Set HIBOB_API_TOKEN and HIBOB_SERVICE_USER_ID environment variables." },
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
    const employees: HiBobEmployee[] = hibobData.employees || []

    // Get existing profiles in the org
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("organization_id", organizationId)

    const existingEmails = new Set(
      (existingProfiles || []).map((p) => p.email.toLowerCase())
    )

    const log: { action: string; count: number; status: string }[] = []
    let created = 0
    let updated = 0
    let skipped = 0

    for (const emp of employees) {
      const email = (emp.email || emp.personal?.communication?.workEmail || "").toLowerCase()
      if (!email) {
        skipped++
        continue
      }

      const profileData = {
        full_name: emp.displayName || `${emp.firstName || ""} ${emp.surname || ""}`.trim(),
        job_title: emp.work?.title || null,
        department: emp.work?.department || null,
        start_date: emp.work?.startDate || null,
        location: emp.work?.site || null,
      }

      if (existingEmails.has(email)) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("email", email)
          .eq("organization_id", organizationId)

        if (!updateError) updated++
      } else {
        // New employee — we can't create an auth user directly,
        // so we log them for manual invitation
        skipped++
      }
    }

    log.push({ action: "Profiles updated", count: updated, status: "success" })
    log.push({
      action: "Skipped (no matching account)",
      count: skipped,
      status: skipped > 0 ? "success" : "success",
    })

    // Fetch time-off from HiBob
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]
      const endOfYear = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0]

      const timeoffResponse = await fetch(
        `https://api.hibob.com/v1/timeoff/whosout?from=${startOfYear}&to=${endOfYear}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${Buffer.from(`${serviceUserId}:${apiToken}`).toString("base64")}`,
            Accept: "application/json",
          },
        }
      )

      if (timeoffResponse.ok) {
        const timeoffData = await timeoffResponse.json()
        const outs = timeoffData.outs || []
        let absencesCreated = 0

        for (const out of outs) {
          const empEmail = out.employeeEmail?.toLowerCase()
          if (!empEmail) continue

          // Find matching profile
          const { data: matchingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", empEmail)
            .eq("organization_id", organizationId)
            .single()

          if (!matchingProfile) continue

          // Upsert absence
          const { error: absError } = await supabase.from("absences").upsert(
            {
              profile_id: matchingProfile.id,
              start_date: out.startDate,
              end_date: out.endDate,
              type: out.policyTypeDisplayName || "vacation",
              description: `Synced from HiBob: ${out.policyTypeDisplayName || "Time off"}`,
              is_approved: true,
            },
            { onConflict: "profile_id,start_date,end_date", ignoreDuplicates: true }
          )

          if (!absError) absencesCreated++
        }

        log.push({ action: "Absences synced", count: absencesCreated, status: "success" })
      }
    } catch {
      log.push({ action: "Absences sync", count: 0, status: "error" })
    }

    return NextResponse.json({
      success: true,
      employeeCount: employees.length,
      log,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}
