"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectOption } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getBatchAvailabilityForDateRange } from "@/lib/actions/staffing"
import type { ConsultantWithAllocation } from "@/lib/actions/staffing"

function getDefaultStartDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function getDefaultEndDate(): string {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`
}

interface AvailabilityBoardProps {
  consultants: ConsultantWithAllocation[]
  onSelect?: (profileId: string) => void
  selectedId?: string | null
  onDateRangeChange?: (startDate: string, endDate: string) => void
}

export function AvailabilityBoard({
  consultants,
  onSelect,
  selectedId,
  onDateRangeChange,
}: AvailabilityBoardProps) {
  const [nameFilter, setNameFilter] = React.useState("")
  const [departmentFilter, setDepartmentFilter] = React.useState("")
  const [skillFilter, setSkillFilter] = React.useState("")
  const [startDate, setStartDate] = React.useState(getDefaultStartDate)
  const [endDate, setEndDate] = React.useState(getDefaultEndDate)
  const [dateAvailability, setDateAvailability] = React.useState<
    Record<string, { usedFte: number; availableFte: number }>
  >({})
  const [loadingAvailability, setLoadingAvailability] = React.useState(false)

  // Fetch availability whenever date range or consultants change
  React.useEffect(() => {
    if (!startDate || !endDate || consultants.length === 0) return

    let cancelled = false
    setLoadingAvailability(true)

    const profileIds = consultants.map((c) => c.id)
    getBatchAvailabilityForDateRange(profileIds, startDate, endDate)
      .then((result) => {
        if (!cancelled) {
          setDateAvailability(result)
        }
      })
      .catch(() => {
        // Silently handle errors; the default display will remain
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false)
      })

    return () => {
      cancelled = true
    }
  }, [consultants, startDate, endDate])

  // Notify parent of date range changes
  React.useEffect(() => {
    onDateRangeChange?.(startDate, endDate)
  }, [startDate, endDate, onDateRangeChange])

  // Extract unique departments and skills for filter dropdowns
  const departments = React.useMemo(() => {
    const deps = new Set<string>()
    for (const c of consultants) {
      if (c.department) deps.add(c.department)
    }
    return Array.from(deps).sort()
  }, [consultants])

  const skills = React.useMemo(() => {
    const skillSet = new Map<string, string>()
    for (const c of consultants) {
      for (const s of c.skills) {
        skillSet.set(s.id, s.name)
      }
    }
    return Array.from(skillSet.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [consultants])

  // Apply filters
  const filteredConsultants = React.useMemo(() => {
    return consultants.filter((c) => {
      if (
        nameFilter &&
        !c.full_name.toLowerCase().includes(nameFilter.toLowerCase())
      ) {
        return false
      }
      if (departmentFilter && c.department !== departmentFilter) {
        return false
      }
      if (
        skillFilter &&
        !c.skills.some((s) => s.id === skillFilter)
      ) {
        return false
      }
      return true
    })
  }, [consultants, nameFilter, departmentFilter, skillFilter])

  function getUtilizationColor(pct: number) {
    if (pct > 100) return "bg-red-500"
    if (pct >= 80) return "bg-yellow-500"
    return "bg-green-500"
  }

  function getUtilizationBg(pct: number) {
    if (pct > 100) return "bg-red-100 dark:bg-red-950"
    if (pct >= 80) return "bg-yellow-100 dark:bg-yellow-950"
    return "bg-green-100 dark:bg-green-950"
  }

  function getFteColor(availableFte: number) {
    if (availableFte > 0.5) return "text-green-600 dark:text-green-400"
    if (availableFte >= 0.1) return "text-amber-600 dark:text-amber-400"
    return "text-red-600 dark:text-red-400"
  }

  function getFteBadgeVariant(availableFte: number): "default" | "secondary" | "destructive" | "outline" {
    if (availableFte > 0.5) return "default"
    if (availableFte >= 0.1) return "secondary"
    return "destructive"
  }

  if (consultants.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No active consultants found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          placeholder="Search by name..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="h-8 text-sm"
        />
        <div className="flex gap-2">
          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-8 text-sm flex-1"
          >
            <SelectOption value="">All departments</SelectOption>
            {departments.map((dep) => (
              <SelectOption key={dep} value={dep}>
                {dep}
              </SelectOption>
            ))}
          </Select>
          <Select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="h-8 text-sm flex-1"
          >
            <SelectOption value="">All skills</SelectOption>
            {skills.map((s) => (
              <SelectOption key={s.id} value={s.id}>
                {s.name}
              </SelectOption>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
      {filteredConsultants.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          No consultants match the current filters.
        </div>
      ) : null}
      {filteredConsultants.map((consultant) => {
        const weeklyCapacity = consultant.weekly_capacity_hours || 40
        const availableHours = Math.max(
          0,
          weeklyCapacity - consultant.allocated_hours_per_week
        )
        const monthlyAvailable = availableHours * 4

        const rangeAvailability = dateAvailability[consultant.id]
        const availableFte = rangeAvailability?.availableFte ?? null

        return (
          <Card
            key={consultant.id}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary/50",
              selectedId === consultant.id && "border-primary ring-1 ring-primary"
            )}
            onClick={() => onSelect?.(consultant.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">
                      {consultant.full_name}
                    </h3>
                    {consultant.allocation_percentage === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        On Bench
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {consultant.job_title || consultant.role}
                  </p>
                  {consultant.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {consultant.skills.slice(0, 5).map((skill) => (
                        <Badge
                          key={skill.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {skill.name}
                        </Badge>
                      ))}
                      {consultant.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{consultant.skills.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {consultant.allocation_percentage}%
                  </div>
                  {availableFte !== null ? (
                    <div
                      className={cn(
                        "text-sm font-medium",
                        getFteColor(availableFte)
                      )}
                    >
                      Available: {availableFte} FTE
                    </div>
                  ) : (
                    <>
                      <div className="text-muted-foreground">
                        {availableHours}h/wk
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {monthlyAvailable}h/mo
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={cn(
                    "h-2 w-full overflow-hidden rounded-full",
                    getUtilizationBg(consultant.allocation_percentage)
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      getUtilizationColor(consultant.allocation_percentage)
                    )}
                    style={{
                      width: `${Math.min(100, consultant.allocation_percentage)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
