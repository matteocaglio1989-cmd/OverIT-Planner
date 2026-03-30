"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectOption } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isWeekend,
  parseISO,
} from "date-fns"
import {
  upsertTimeEntry,
  deleteTimeEntry,
  submitTimesheet,
} from "@/lib/actions/timesheets"
import type { TimeEntry, TimesheetPeriod } from "@/lib/types/database"

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

interface TimesheetGridProps {
  profileId: string
  weekStart: Date
  entries: TimeEntryWithProject[]
  planned: PlannedAllocation[]
  period: TimesheetPeriod | null
  availableProjects: AvailableProject[]
  weeklyCapacityHours?: number
  onRefresh?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GridRow = {
  projectId: string
  projectName: string
  projectColor: string
  isBillable: boolean
  cells: Record<string, { hours: number; entryId?: string; planned: number }>
}

function buildGrid(
  entries: TimeEntryWithProject[],
  planned: PlannedAllocation[],
  days: Date[]
): GridRow[] {
  const dayStrings = days.map((d) => format(d, "yyyy-MM-dd"))
  const rowMap = new Map<string, GridRow>()

  // Seed rows from planned allocations
  for (const alloc of planned) {
    if (!alloc.project) continue
    if (!rowMap.has(alloc.project_id)) {
      const cells: GridRow["cells"] = {}
      for (const ds of dayStrings) {
        cells[ds] = { hours: 0, planned: 0 }
      }
      rowMap.set(alloc.project_id, {
        projectId: alloc.project_id,
        projectName: alloc.project.name,
        projectColor: alloc.project.color,
        isBillable: alloc.project.is_billable,
        cells,
      })
    }
    const row = rowMap.get(alloc.project_id)!
    for (const ds of dayStrings) {
      const d = parseISO(ds)
      if (d >= parseISO(alloc.start_date) && d <= parseISO(alloc.end_date) && !isWeekend(d)) {
        row.cells[ds].planned += alloc.hours_per_day
      }
    }
  }

  // Overlay time entries
  for (const entry of entries) {
    const pid = entry.project_id ?? "__none__"
    if (!rowMap.has(pid)) {
      const cells: GridRow["cells"] = {}
      for (const ds of dayStrings) {
        cells[ds] = { hours: 0, planned: 0 }
      }
      rowMap.set(pid, {
        projectId: pid,
        projectName: entry.project?.name ?? "Unknown",
        projectColor: entry.project?.color ?? "#6366f1",
        isBillable: entry.project?.is_billable ?? false,
        cells,
      })
    }
    const row = rowMap.get(pid)!
    const ds = entry.date
    if (row.cells[ds]) {
      row.cells[ds].hours = entry.hours
      row.cells[ds].entryId = entry.id
    }
  }

  return Array.from(rowMap.values())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimesheetGrid({
  profileId,
  weekStart,
  entries,
  planned,
  period,
  availableProjects,
  weeklyCapacityHours,
  onRefresh,
}: TimesheetGridProps) {
  const dailyTargetHours = (weeklyCapacityHours ?? 40) / 5
  const days = React.useMemo(
    () =>
      eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 }),
      }),
    [weekStart]
  )
  const dayStrings = React.useMemo(
    () => days.map((d) => format(d, "yyyy-MM-dd")),
    [days]
  )

  const [rows, setRows] = React.useState<GridRow[]>(() =>
    buildGrid(entries, planned, days)
  )
  const [saving, setSaving] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [addingProject, setAddingProject] = React.useState(false)
  const [newProjectId, setNewProjectId] = React.useState("")

  const isLocked = period?.status === "approved" || period?.status === "submitted"

  // Rebuild grid when props change
  React.useEffect(() => {
    setRows(buildGrid(entries, planned, days))
  }, [entries, planned, days])

  async function handleCellChange(
    rowIdx: number,
    dayStr: string,
    value: string
  ) {
    const numVal = parseFloat(value) || 0
    const clampedVal = Math.max(0, Math.min(24, numVal))

    setRows((prev) => {
      const next = [...prev]
      next[rowIdx] = {
        ...next[rowIdx],
        cells: {
          ...next[rowIdx].cells,
          [dayStr]: { ...next[rowIdx].cells[dayStr], hours: clampedVal },
        },
      }
      return next
    })

    // Debounced save
    const row = rows[rowIdx]
    const cell = row.cells[dayStr]
    setSaving(true)
    try {
      if (clampedVal === 0 && cell.entryId) {
        await deleteTimeEntry(cell.entryId)
      } else if (clampedVal > 0) {
        await upsertTimeEntry({
          id: cell.entryId,
          profile_id: profileId,
          project_id: row.projectId,
          date: dayStr,
          hours: clampedVal,
          is_billable: row.isBillable,
        })
      }
      onRefresh?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitTimesheet(profileId, format(weekStart, "yyyy-MM-dd"))
      onRefresh?.()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  function handleAddProject() {
    if (!newProjectId) return
    const proj = availableProjects.find((p) => p.id === newProjectId)
    if (!proj) return
    if (rows.some((r) => r.projectId === newProjectId)) {
      setAddingProject(false)
      setNewProjectId("")
      return
    }

    const cells: GridRow["cells"] = {}
    for (const ds of dayStrings) {
      cells[ds] = { hours: 0, planned: 0 }
    }
    setRows((prev) => [
      ...prev,
      {
        projectId: proj.id,
        projectName: proj.name,
        projectColor: proj.color,
        isBillable: proj.is_billable,
        cells,
      },
    ])
    setAddingProject(false)
    setNewProjectId("")
  }

  // Compute totals
  const dailyTotals: Record<string, number> = {}
  for (const ds of dayStrings) {
    dailyTotals[ds] = rows.reduce((sum, r) => sum + (r.cells[ds]?.hours ?? 0), 0)
  }
  const grandTotal = Object.values(dailyTotals).reduce((s, v) => s + v, 0)

  const usedProjectIds = new Set(rows.map((r) => r.projectId))
  const addableProjects = availableProjects.filter(
    (p) => !usedProjectIds.has(p.id)
  )

  return (
    <div className="space-y-4">
      {/* Status badge */}
      {period && (
        <div className="flex items-center gap-2">
          <Badge
            variant={
              period.status === "approved"
                ? "default"
                : period.status === "submitted"
                  ? "secondary"
                  : period.status === "rejected"
                    ? "destructive"
                    : "outline"
            }
          >
            {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
          </Badge>
          {period.rejection_reason && (
            <span className="text-sm text-destructive">
              Reason: {period.rejection_reason}
            </span>
          )}
          {saving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
      )}

      {/* Desktop grid */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Project</th>
                {days.map((day) => (
                  <th
                    key={day.toISOString()}
                    className={cn(
                      "w-20 px-2 py-2 text-center font-medium",
                      isWeekend(day) && "bg-muted"
                    )}
                  >
                    <div>{format(day, "EEE")}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(day, "d")}
                    </div>
                  </th>
                ))}
                <th className="w-20 px-2 py-2 text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const rowTotal = dayStrings.reduce(
                  (sum, ds) => sum + (row.cells[ds]?.hours ?? 0),
                  0
                )
                return (
                  <tr key={row.projectId} className="border-b">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.projectColor }}
                        />
                        <span className="truncate">{row.projectName}</span>
                        {row.isBillable && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            $
                          </Badge>
                        )}
                      </div>
                    </td>
                    {days.map((day) => {
                      const ds = format(day, "yyyy-MM-dd")
                      const cell = row.cells[ds]
                      const differs =
                        cell && cell.planned > 0 && cell.hours !== cell.planned
                      return (
                        <td
                          key={ds}
                          className={cn(
                            "px-1 py-1 text-center",
                            isWeekend(day) && "bg-muted/50",
                            differs && "bg-amber-50 dark:bg-amber-950/30"
                          )}
                        >
                          <Input
                            type="number"
                            min={0}
                            max={24}
                            step={0.25}
                            value={cell?.hours || ""}
                            placeholder={
                              cell?.planned ? String(cell.planned) : ""
                            }
                            disabled={isLocked}
                            className="h-8 w-full text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            onBlur={(e) =>
                              handleCellChange(rowIdx, ds, e.target.value)
                            }
                            onChange={() => {}} // controlled via onBlur
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                          />
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-center font-medium">
                      {rowTotal > 0 ? rowTotal : ""}
                    </td>
                  </tr>
                )
              })}

              {/* Daily totals row */}
              <tr className="border-t bg-muted/50 font-medium">
                <td className="px-3 py-2">Daily Total</td>
                {days.map((day) => {
                  const ds = format(day, "yyyy-MM-dd")
                  const total = dailyTotals[ds] ?? 0
                  const target = isWeekend(day) ? 0 : dailyTargetHours
                  const isOver = total > target && target > 0
                  const isUnder = total > 0 && total < target
                  return (
                    <td
                      key={ds}
                      className={cn(
                        "px-2 py-2 text-center",
                        isOver && "text-red-600 dark:text-red-400",
                        isUnder && "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {total > 0 || target > 0
                        ? `${total} / ${target}h`
                        : ""}
                    </td>
                  )
                })}
                <td className="px-2 py-2 text-center font-bold">
                  {grandTotal > 0 ? grandTotal : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile stacked view */}
      <div className="space-y-4 md:hidden">
        {rows.map((row, rowIdx) => {
          const rowTotal = dayStrings.reduce(
            (sum, ds) => sum + (row.cells[ds]?.hours ?? 0),
            0
          )
          return (
            <div key={row.projectId} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.projectColor }}
                />
                <span className="font-medium">{row.projectName}</span>
                <span className="ml-auto text-sm text-muted-foreground">
                  {rowTotal}h
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const ds = format(day, "yyyy-MM-dd")
                  const cell = row.cells[ds]
                  return (
                    <div key={ds} className="text-center">
                      <div className="mb-1 text-xs text-muted-foreground">
                        {format(day, "EEE")}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.25}
                        value={cell?.hours || ""}
                        placeholder={cell?.planned ? String(cell.planned) : "0"}
                        disabled={isLocked}
                        className="h-8 text-center text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        onBlur={(e) =>
                          handleCellChange(rowIdx, ds, e.target.value)
                        }
                        onChange={() => {}}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            ;(e.target as HTMLInputElement).blur()
                          }
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add project row */}
      {!isLocked && (
        <div>
          {addingProject ? (
            <div className="flex items-center gap-2">
              <Select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="max-w-xs"
              >
                <SelectOption value="">Select project...</SelectOption>
                {addableProjects.map((p) => (
                  <SelectOption key={p.id} value={p.id}>
                    {p.name}
                  </SelectOption>
                ))}
              </Select>
              <Button size="sm" onClick={handleAddProject}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddingProject(false)
                  setNewProjectId("")
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingProject(true)}
            >
              + Add Project
            </Button>
          )}
        </div>
      )}

      {/* Submit button */}
      {!isLocked && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting || grandTotal === 0}
          >
            {submitting ? "Submitting..." : "Submit Timesheet"}
          </Button>
        </div>
      )}
    </div>
  )
}
