"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ConsultantWithAllocation } from "@/lib/actions/staffing"

interface AvailabilityBoardProps {
  consultants: ConsultantWithAllocation[]
  onSelect?: (profileId: string) => void
  selectedId?: string | null
}

export function AvailabilityBoard({
  consultants,
  onSelect,
  selectedId,
}: AvailabilityBoardProps) {
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

  if (consultants.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No active consultants found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {consultants.map((consultant) => {
        const weeklyCapacity = consultant.weekly_capacity_hours || 40
        const availableHours = Math.max(
          0,
          weeklyCapacity - consultant.allocated_hours_per_week
        )
        const monthlyAvailable = availableHours * 4

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
                  <div className="text-muted-foreground">
                    {availableHours}h/wk
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {monthlyAvailable}h/mo
                  </div>
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
