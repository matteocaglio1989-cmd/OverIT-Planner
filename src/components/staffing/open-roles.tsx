"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { OpenRoleWithProject } from "@/lib/actions/staffing"

function formatRoleDates(startDate: string | null, endDate: string | null): string {
  const fmt = (d: string) => {
    const date = new Date(d + "T00:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  if (startDate && endDate) return `${fmt(startDate)} \u2014 ${fmt(endDate)}`
  if (startDate) return fmt(startDate)
  if (endDate) return `\u2014 ${fmt(endDate)}`
  return ""
}

interface OpenRolesProps {
  roles: OpenRoleWithProject[]
  onMatch?: (roleId: string) => void
  onAssign?: (roleId: string) => void
  selectedRoleId?: string | null
}

export function OpenRoles({
  roles,
  onMatch,
  onAssign,
  selectedRoleId,
}: OpenRolesProps) {
  if (roles.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No open roles found. All roles are filled.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {roles.map((role) => (
        <Card
          key={role.id}
          className={cn(
            "transition-colors",
            selectedRoleId === role.id && "border-primary ring-1 ring-primary"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: role.project?.color || "#6366f1" }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {role.project?.name}
                  </span>
                </div>
                <h3 className="mt-1 font-medium">{role.title}</h3>
                {role.required_skills && role.required_skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.required_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  {role.fte != null && (
                    <span>
                      {role.remaining_fte} / {role.fte} FTE remaining
                      {role.allocated_fte > 0 && ` (${role.allocated_fte} allocated)`}
                    </span>
                  )}
                  {role.bill_rate != null && (
                    <span>${role.bill_rate}/hr</span>
                  )}
                  {(role.start_date || role.end_date) && (
                    <span>
                      {formatRoleDates(role.start_date, role.end_date)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMatch?.(role.id)
                  }}
                >
                  Match
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAssign?.(role.id)
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
