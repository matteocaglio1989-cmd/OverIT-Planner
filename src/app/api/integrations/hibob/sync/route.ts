import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  appRoleId: string | null // null = create new
  appRoleName: string
  defaultBillRate: number | null
}

export async function POST(request: Request) {
  try {
    const {
      organizationId,
      selectedEmployees,
      roleMappings,
      createMissingRoles,
    }: {
      organizationId: string
      selectedEmployees: SyncEmployee[]
      roleMappings: RoleMapping[]
      createMissingRoles: boolean
    } = await request.json()

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
      .select("organization_id, role")
      .eq("id", userData.user.id)
      .single()

    if (!profile || profile.organization_id !== organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const log: { action: string; count: number; status: string }[] = []

    // Step 1: Create missing role definitions if requested
    if (createMissingRoles && roleMappings.length > 0) {
      let rolesCreated = 0
      for (const mapping of roleMappings) {
        if (!mapping.appRoleId) {
          // Create new role definition
          const { error } = await supabase.from("role_definitions").insert({
            organization_id: organizationId,
            name: mapping.appRoleName || mapping.hibobTitle,
            default_bill_rate: mapping.defaultBillRate,
          })
          if (!error) rolesCreated++
        }
      }
      if (rolesCreated > 0) {
        log.push({ action: "Role definitions created", count: rolesCreated, status: "success" })
      }
    }

    // Step 2: Update existing profiles (duplicates with changes)
    let updated = 0
    const duplicates = selectedEmployees.filter((e) => e.isDuplicate && e.existingProfileId)
    for (const emp of duplicates) {
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
    if (updated > 0) {
      log.push({ action: "Existing profiles updated", count: updated, status: "success" })
    }

    // Step 3: New employees — we can't create auth users via client SDK,
    // so we log them for invitation
    const newEmployees = selectedEmployees.filter((e) => !e.isDuplicate)
    if (newEmployees.length > 0) {
      log.push({
        action: "New people (need invitation)",
        count: newEmployees.length,
        status: "success",
      })
    }

    // Step 4: Sync time-off / absences
    const apiToken = process.env.HIBOB_API_TOKEN
    const serviceUserId = process.env.HIBOB_SERVICE_USER_ID

    if (apiToken && serviceUserId) {
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

          // Only sync absences for selected employees
          const selectedEmails = new Set(selectedEmployees.map((e) => e.email.toLowerCase()))

          for (const out of outs) {
            const empEmail = (out.employeeEmail || "").toLowerCase()
            if (!empEmail || !selectedEmails.has(empEmail)) continue

            const { data: matchingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", empEmail)
              .eq("organization_id", organizationId)
              .single()

            if (!matchingProfile) continue

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

          if (absencesCreated > 0) {
            log.push({ action: "Absences synced", count: absencesCreated, status: "success" })
          }
        }
      } catch {
        log.push({ action: "Absences sync", count: 0, status: "error" })
      }
    }

    return NextResponse.json({
      success: true,
      employeeCount: selectedEmployees.length,
      log,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}
