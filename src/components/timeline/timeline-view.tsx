"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { format } from "date-fns"
import { useTimelineStore } from "@/stores/timeline-store"
import { createClient } from "@/lib/supabase/client"
import { TimelineHeader } from "@/components/timeline/timeline-header"
import { TimelineSidebar, ROW_HEIGHT } from "@/components/timeline/timeline-sidebar"
import { TimelineGrid } from "@/components/timeline/timeline-grid"
import { TimelineFilters } from "@/components/timeline/timeline-filters"
import { AllocationDialog } from "@/components/timeline/allocation-dialog"
import type {
  Allocation,
  Absence,
  Profile,
  Project,
  ProjectRole,
  PublicHoliday,
  Skill,
} from "@/lib/types/database"

export interface OpenRoleWithProject extends ProjectRole {
  project: Pick<Project, "id" | "name" | "status" | "start_date" | "end_date" | "color">
}

interface TimelineViewProps {
  initialProfiles: Profile[]
  initialAllocations: (Allocation & {
    project?: { name: string; color: string; id: string } | null
    profile?: Profile | null
  })[]
  initialAbsences: Absence[]
  initialHolidays: PublicHoliday[]
  projects: Project[]
  skills: Skill[]
  initialOpenRoles?: OpenRoleWithProject[]
}

export function TimelineView({
  initialProfiles,
  initialAllocations,
  initialAbsences,
  initialHolidays,
  projects,
  skills,
  initialOpenRoles = [],
}: TimelineViewProps) {
  const { startDate, endDate, filters, zoom } = useTimelineStore()

  const [profiles] = useState(initialProfiles)
  const [allocations, setAllocations] = useState(initialAllocations)
  const [absences, setAbsences] = useState(initialAbsences)
  const [holidays, setHolidays] = useState(initialHolidays)
  const [openRoles, setOpenRoles] = useState(initialOpenRoles)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAllocation, setEditingAllocation] =
    useState<Allocation | null>(null)
  const [defaultProfileId, setDefaultProfileId] = useState<string>("")
  const [defaultDate, setDefaultDate] = useState<string>("")

  // Track whether we've moved away from initial range
  const initialRangeRef = useRef({
    start: format(startDate, "yyyy-MM-dd"),
    end: format(endDate, "yyyy-MM-dd"),
  })

  // Re-fetch data when date range changes (client-side)
  useEffect(() => {
    const startStr = format(startDate, "yyyy-MM-dd")
    const endStr = format(endDate, "yyyy-MM-dd")

    // Skip if still on initial range
    if (
      startStr === initialRangeRef.current.start &&
      endStr === initialRangeRef.current.end
    ) {
      return
    }

    let cancelled = false

    async function fetchData() {
      const supabase = createClient()
      if (!supabase) return

      try {
        const [allocResult, absResult, holResult] = await Promise.all([
          supabase
            .from("allocations")
            .select("*, project:projects(*), profile:profiles(*)")
            .lte("start_date", endStr)
            .gte("end_date", startStr)
            .order("start_date"),
          supabase
            .from("absences")
            .select("*")
            .lte("start_date", endStr)
            .gte("end_date", startStr)
            .order("start_date"),
          supabase
            .from("public_holidays")
            .select("*")
            .gte("date", startStr)
            .lte("date", endStr)
            .order("date"),
        ])

        if (cancelled) return

        if (allocResult.data) setAllocations(allocResult.data as typeof allocations)
        if (absResult.data) setAbsences(absResult.data as Absence[])
        if (holResult.data) setHolidays(holResult.data as PublicHoliday[])
      } catch (err) {
        console.error("Failed to fetch timeline data:", err)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    let result = profiles

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.job_title && p.job_title.toLowerCase().includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q))
      )
    }

    if (filters.team) {
      result = result.filter((p) => p.department === filters.team)
    }

    if (filters.project) {
      const profileIdsWithProject = new Set(
        allocations
          .filter((a) => a.project_id === filters.project)
          .map((a) => a.profile_id)
      )
      result = result.filter((p) => profileIdsWithProject.has(p.id))
    }

    return result
  }, [profiles, filters, allocations])

  // Filter allocations by project filter
  const filteredAllocations = useMemo(() => {
    if (!filters.project) return allocations
    return allocations.filter((a) => a.project_id === filters.project)
  }, [allocations, filters.project])

  // Sync sidebar scroll with grid scroll
  const sidebarRef = useRef<HTMLDivElement>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)

  const handleGridScroll = useCallback(() => {
    if (gridContainerRef.current && sidebarRef.current) {
      const scrollTop = gridContainerRef.current.scrollTop
      sidebarRef.current.scrollTop = scrollTop
    }
  }, [])

  // Cell click handler
  const handleCellClick = useCallback(
    (profileId: string, date: Date) => {
      setEditingAllocation(null)
      setDefaultProfileId(profileId)
      setDefaultDate(format(date, "yyyy-MM-dd"))
      setDialogOpen(true)
    },
    []
  )

  // Allocation click handler
  const handleAllocationClick = useCallback((allocation: Allocation) => {
    setEditingAllocation(allocation)
    setDefaultProfileId("")
    setDefaultDate("")
    setDialogOpen(true)
  }, [])

  // After mutation, refetch
  const handleMutationSuccess = useCallback(() => {
    const startStr = format(startDate, "yyyy-MM-dd")
    const endStr = format(endDate, "yyyy-MM-dd")

    async function refetch() {
      const supabase = createClient()
      if (!supabase) return

      const [allocResult, rolesResult] = await Promise.all([
        supabase
          .from("allocations")
          .select("*, project:projects(*), profile:profiles(*)")
          .lte("start_date", endStr)
          .gte("end_date", startStr)
          .order("start_date"),
        supabase
          .from("project_roles")
          .select("*, project:projects(id, name, status, start_date, end_date, color)")
          .eq("is_filled", false),
      ])

      if (allocResult.data) setAllocations(allocResult.data as typeof allocations)
      if (rolesResult.data) setOpenRoles(rolesResult.data as OpenRoleWithProject[])
    }

    refetch()
  }, [startDate, endDate])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] border rounded-lg overflow-hidden bg-background">
      {/* Filters */}
      <TimelineFilters
        profiles={profiles}
        projects={projects}
        skills={skills}
      />

      {/* Header with controls and date columns */}
      <TimelineHeader holidays={holidays} />

      {/* Main content: sidebar + grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className="overflow-hidden"
          style={{ width: 240, minWidth: 240 }}
        >
          <TimelineSidebar profiles={filteredProfiles} openRoles={openRoles} />
        </div>

        {/* Grid */}
        <div
          ref={gridContainerRef}
          className="flex-1 overflow-auto border-l"
          onScroll={handleGridScroll}
        >
          <TimelineGrid
            profiles={filteredProfiles}
            allocations={filteredAllocations}
            absences={absences}
            holidays={holidays}
            openRoles={openRoles}
            onCellClick={handleCellClick}
            onAllocationClick={handleAllocationClick}
          />
        </div>
      </div>

      {/* Allocation Dialog */}
      <AllocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allocation={editingAllocation}
        profiles={profiles}
        projects={projects}
        defaultProfileId={defaultProfileId}
        defaultDate={defaultDate}
        onSuccess={handleMutationSuccess}
      />
    </div>
  )
}
