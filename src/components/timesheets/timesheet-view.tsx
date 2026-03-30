"use client"

import * as React from "react"
import { startOfWeek, format } from "date-fns"
import { WeekNavigator } from "./week-navigator"
import { TimesheetGrid } from "./timesheet-grid"
import {
  getTimeEntries,
  getPlannedHours,
  getTimesheetPeriod,
  getUserProjects,
} from "@/lib/actions/timesheets"
import type { TimesheetPeriod, TimeEntry } from "@/lib/types/database"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimeEntryWithProject extends Omit<TimeEntry, "project"> {
  project: { id: string; name: string; color: string; is_billable: boolean } | null
}

interface PlannedAllocation {
  id: string
  project_id: string
  hours_per_day: number
  start_date: string
  end_date: string
  project: { id: string; name: string; color: string; is_billable: boolean } | null
}

interface AvailableProject {
  id: string
  name: string
  color: string
  is_billable: boolean
}

interface TimesheetViewProps {
  profileId: string
  initialWeekStart: string
  initialEntries: TimeEntryWithProject[]
  initialPlanned: PlannedAllocation[]
  initialPeriod: TimesheetPeriod | null
  initialProjects: AvailableProject[]
  weeklyCapacityHours?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimesheetView({
  profileId,
  initialWeekStart,
  initialEntries,
  initialPlanned,
  initialPeriod,
  initialProjects,
  weeklyCapacityHours,
}: TimesheetViewProps) {
  const [weekStart, setWeekStart] = React.useState<Date>(
    () => new Date(initialWeekStart)
  )
  const [entries, setEntries] = React.useState(initialEntries)
  const [planned, setPlanned] = React.useState(initialPlanned)
  const [period, setPeriod] = React.useState(initialPeriod)
  const [projects, setProjects] = React.useState(initialProjects)
  const [loading, setLoading] = React.useState(false)

  const weekStartStr = format(weekStart, "yyyy-MM-dd")

  // Whether we're on the initial week (use props directly)
  const isInitialWeek = weekStartStr === initialWeekStart

  async function loadWeek(ws: Date) {
    const wsStr = format(ws, "yyyy-MM-dd")
    setLoading(true)
    try {
      const [e, p, tp, pr] = await Promise.all([
        getTimeEntries(profileId, wsStr),
        getPlannedHours(profileId, wsStr),
        getTimesheetPeriod(profileId, wsStr),
        getUserProjects(profileId),
      ])
      setEntries(e as TimeEntryWithProject[])
      setPlanned(p as PlannedAllocation[])
      setPeriod(tp)
      setProjects(pr)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleWeekChange(ws: Date) {
    setWeekStart(ws)
    loadWeek(ws)
  }

  function handleRefresh() {
    loadWeek(weekStart)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <WeekNavigator weekStart={weekStart} onChange={handleWeekChange} />
        {loading && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
      </div>

      <TimesheetGrid
        profileId={profileId}
        weekStart={weekStart}
        entries={entries}
        planned={planned}
        period={period}
        availableProjects={projects}
        weeklyCapacityHours={weeklyCapacityHours}
        onRefresh={handleRefresh}
      />
    </div>
  )
}
