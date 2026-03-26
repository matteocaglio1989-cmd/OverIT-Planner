"use client"

import { useMemo, useCallback, useRef, useEffect } from "react"
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  isWeekend,
  parseISO,
  max as dateMax,
  min as dateMin,
  startOfWeek,
  startOfMonth,
  isSameDay,
} from "date-fns"
import { cn } from "@/lib/utils"
import { useTimelineStore, type ZoomLevel } from "@/stores/timeline-store"
import { AllocationBlock } from "@/components/timeline/allocation-block"
import { ROW_HEIGHT } from "@/components/timeline/timeline-sidebar"
import { COLUMN_WIDTHS } from "@/components/timeline/timeline-header"
import type {
  Allocation,
  Absence,
  Profile,
  PublicHoliday,
} from "@/lib/types/database"
import type { OpenRoleWithProject } from "@/components/timeline/timeline-view"

interface TimelineGridProps {
  profiles: Profile[]
  allocations: (Allocation & {
    project?: { name: string; color: string; id: string } | null
    profile?: Profile | null
  })[]
  absences: Absence[]
  holidays: PublicHoliday[]
  openRoles?: OpenRoleWithProject[]
  onCellClick: (profileId: string, date: Date) => void
  onAllocationClick: (allocation: Allocation) => void
}

export function TimelineGrid({
  profiles,
  allocations,
  absences,
  holidays,
  openRoles = [],
  onCellClick,
  onAllocationClick,
}: TimelineGridProps) {
  const { zoom, startDate, endDate } = useTimelineStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const colWidth = COLUMN_WIDTHS[zoom]

  // Build time columns
  const columns = useMemo(() => {
    if (zoom === "day") {
      return eachDayOfInterval({ start: startDate, end: endDate })
    }
    if (zoom === "week") {
      return eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 }
      )
    }
    return eachMonthOfInterval({ start: startDate, end: endDate })
  }, [zoom, startDate, endDate])

  const totalWidth = columns.length * colWidth

  // Holiday date set
  const holidayDates = useMemo(
    () => new Set(holidays.map((h) => h.date)),
    [holidays]
  )

  // Build per-profile allocation & absence maps
  const profileAllocations = useMemo(() => {
    const map = new Map<string, typeof allocations>()
    for (const a of allocations) {
      const list = map.get(a.profile_id) || []
      list.push(a)
      map.set(a.profile_id, list)
    }
    return map
  }, [allocations])

  const profileAbsences = useMemo(() => {
    const map = new Map<string, Absence[]>()
    for (const a of absences) {
      const list = map.get(a.profile_id) || []
      list.push(a)
      map.set(a.profile_id, list)
    }
    return map
  }, [absences])

  // Conflict detection: for each profile, compute over-allocated days
  const conflicts = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const profile of profiles) {
      const dailyCapacity = profile.weekly_capacity_hours / 5
      const allocs = profileAllocations.get(profile.id) || []
      if (allocs.length === 0) continue

      // Sum hours per day
      const dayHours = new Map<string, number>()
      for (const a of allocs) {
        const aStart = dateMax([parseISO(a.start_date), startDate])
        const aEnd = dateMin([parseISO(a.end_date), endDate])
        if (aStart > aEnd) continue
        const days = eachDayOfInterval({ start: aStart, end: aEnd })
        for (const d of days) {
          if (isWeekend(d)) continue
          const key = format(d, "yyyy-MM-dd")
          dayHours.set(key, (dayHours.get(key) || 0) + a.hours_per_day)
        }
      }

      const overDays = new Set<string>()
      for (const [day, hours] of dayHours) {
        if (hours > dailyCapacity) {
          overDays.add(day)
        }
      }
      if (overDays.size > 0) {
        map.set(profile.id, overDays)
      }
    }
    return map
  }, [profiles, profileAllocations, startDate, endDate])

  // Calculate pixel position for a date
  const getPosition = useCallback(
    (date: Date): number => {
      if (zoom === "day") {
        const diff = differenceInDays(date, startDate)
        return diff * colWidth
      }
      if (zoom === "week") {
        const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
        const diffDays = differenceInDays(date, weekStart)
        return (diffDays / 7) * colWidth
      }
      // month
      const monthStart = startOfMonth(startDate)
      const diffDays = differenceInDays(date, monthStart)
      const totalDaysInView = differenceInDays(endDate, monthStart) || 1
      const totalMonths =
        differenceInMonths(endDate, monthStart) + 1 || 1
      return (diffDays / (totalDaysInView / totalMonths)) * colWidth
    },
    [zoom, startDate, endDate, colWidth]
  )

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        {profiles.map((profile) => {
          const allocs = profileAllocations.get(profile.id) || []
          const abs = profileAbsences.get(profile.id) || []
          const profileConflicts = conflicts.get(profile.id)

          return (
            <TimelineRow
              key={profile.id}
              profile={profile}
              allocations={allocs}
              absences={abs}
              holidays={holidays}
              holidayDates={holidayDates}
              conflicts={profileConflicts}
              columns={columns}
              zoom={zoom}
              colWidth={colWidth}
              totalWidth={totalWidth}
              startDate={startDate}
              endDate={endDate}
              getPosition={getPosition}
              onCellClick={onCellClick}
              onAllocationClick={onAllocationClick}
            />
          )
        })}
        {profiles.length === 0 && openRoles.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No people to display
          </div>
        )}

        {/* Open Roles Section */}
        {openRoles.length > 0 && (
          <>
            {/* Section header row */}
            <div
              className="border-b bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              style={{ height: ROW_HEIGHT, width: totalWidth }}
            />
            {/* Open role rows with project date range blocks */}
            {openRoles.map((role) => {
              const projStart = role.project?.start_date
                ? parseISO(role.project.start_date)
                : null
              const projEnd = role.project?.end_date
                ? parseISO(role.project.end_date)
                : null

              // Only show block if project has dates within the view range
              const blockStart =
                projStart && projStart >= startDate
                  ? projStart
                  : startDate
              const blockEnd =
                projEnd && projEnd <= endDate ? projEnd : endDate

              const showBlock = projStart || projEnd

              const left = showBlock ? getPosition(blockStart) : 0
              const right = showBlock ? getPosition(blockEnd) : 0
              const width = showBlock
                ? right - left + colWidth * (zoom === "day" ? 1 : 0.15)
                : 0

              return (
                <div
                  key={role.id}
                  className="relative border-b bg-amber-50/30 dark:bg-amber-950/10"
                  style={{ height: ROW_HEIGHT, width: totalWidth }}
                >
                  {/* Background grid cells */}
                  <div className="absolute inset-0 flex">
                    {columns.map((col) => {
                      const dateStr = format(
                        col,
                        zoom === "month" ? "yyyy-MM" : "yyyy-MM-dd"
                      )
                      return (
                        <div
                          key={dateStr}
                          className="border-r h-full"
                          style={{ width: colWidth, minWidth: colWidth }}
                        />
                      )
                    })}
                  </div>
                  {/* Dashed block showing needed period */}
                  {showBlock && width > 0 && (
                    <div
                      className="absolute top-2 rounded-md flex items-center px-2 text-xs font-medium truncate"
                      style={{
                        left: Math.max(left, 0),
                        width: Math.max(width, 40),
                        height: 30,
                        backgroundColor: `${role.project?.color || "#f59e0b"}20`,
                        border: `2px dashed ${role.project?.color || "#f59e0b"}`,
                        color: role.project?.color || "#f59e0b",
                      }}
                      title={`${role.title} — ${role.project?.name} (unallocated)`}
                    >
                      <span className="truncate">
                        {role.title} — needs staffing
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface TimelineRowProps {
  profile: Profile
  allocations: (Allocation & {
    project?: { name: string; color: string; id: string } | null
    profile?: Profile | null
  })[]
  absences: Absence[]
  holidays: PublicHoliday[]
  holidayDates: Set<string>
  conflicts: Set<string> | undefined
  columns: Date[]
  zoom: ZoomLevel
  colWidth: number
  totalWidth: number
  startDate: Date
  endDate: Date
  getPosition: (date: Date) => number
  onCellClick: (profileId: string, date: Date) => void
  onAllocationClick: (allocation: Allocation) => void
}

function TimelineRow({
  profile,
  allocations,
  absences,
  holidayDates,
  conflicts,
  columns,
  zoom,
  colWidth,
  totalWidth,
  startDate,
  endDate,
  getPosition,
  onCellClick,
  onAllocationClick,
}: TimelineRowProps) {
  return (
    <div
      className="relative border-b"
      style={{ height: ROW_HEIGHT, width: totalWidth }}
    >
      {/* Background grid cells */}
      <div className="absolute inset-0 flex">
        {columns.map((col) => {
          const dateStr = format(
            col,
            zoom === "month" ? "yyyy-MM" : "yyyy-MM-dd"
          )
          const isHol =
            zoom === "day" && holidayDates.has(dateStr)
          const isWknd = zoom === "day" && isWeekend(col)
          const hasConflict =
            zoom === "day" && conflicts?.has(dateStr)

          return (
            <div
              key={dateStr}
              className={cn(
                "border-r h-full cursor-pointer hover:bg-muted/30 transition-colors",
                isWknd && "bg-muted/30",
                isHol && "bg-amber-50/50 dark:bg-amber-950/10",
                hasConflict && "bg-red-50 dark:bg-red-950/20"
              )}
              style={{ width: colWidth, minWidth: colWidth }}
              onClick={() => onCellClick(profile.id, col)}
            />
          )
        })}
      </div>

      {/* Conflict indicators for non-day zoom */}
      {zoom !== "day" && conflicts && conflicts.size > 0 && (
        <div
          className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500"
          title="Over-allocated on some days"
        />
      )}

      {/* Absence blocks */}
      {absences.map((absence) => {
        const aStart = dateMax([parseISO(absence.start_date), startDate])
        const aEnd = dateMin([parseISO(absence.end_date), endDate])
        if (aStart > aEnd) return null

        const left = getPosition(aStart)
        const right = getPosition(aEnd)
        const width = right - left + colWidth * (zoom === "day" ? 1 : 0.15)

        return (
          <div
            key={absence.id}
            className="absolute top-1 rounded-md bg-gray-300/60 dark:bg-gray-600/40 flex items-center px-1.5 text-xs text-muted-foreground font-medium truncate pointer-events-none"
            style={{
              left: Math.max(left, 0),
              width: Math.max(width, 16),
              height: 30,
            }}
            title={`${absence.type}${absence.description ? ` - ${absence.description}` : ""}`}
          >
            <span className="truncate">{absence.type || "Absence"}</span>
          </div>
        )
      })}

      {/* Allocation blocks */}
      {allocations.map((allocation) => {
        const aStart = dateMax([parseISO(allocation.start_date), startDate])
        const aEnd = dateMin([parseISO(allocation.end_date), endDate])
        if (aStart > aEnd) return null

        const left = getPosition(aStart)
        const right = getPosition(aEnd)
        const width = right - left + colWidth * (zoom === "day" ? 1 : 0.15)

        return (
          <AllocationBlock
            key={allocation.id}
            allocation={allocation}
            left={Math.max(left, 0)}
            width={Math.max(width, 16)}
            onClick={() => onAllocationClick(allocation)}
          />
        )
      })}
    </div>
  )
}
