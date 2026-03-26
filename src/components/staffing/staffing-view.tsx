"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AvailabilityBoard } from "./availability-board"
import { OpenRoles } from "./open-roles"
import { SkillMatcher } from "./skill-matcher"
import type {
  ConsultantWithAllocation,
  OpenRoleWithProject,
} from "@/lib/actions/staffing"

interface StaffingViewProps {
  consultants: ConsultantWithAllocation[]
  openRoles: OpenRoleWithProject[]
}

export function StaffingView({ consultants, openRoles }: StaffingViewProps) {
  const router = useRouter()
  const [selectedConsultant, setSelectedConsultant] = React.useState<
    string | null
  >(null)
  const [matchRoleId, setMatchRoleId] = React.useState<string | null>(null)
  const [assignRoleId, setAssignRoleId] = React.useState<string | null>(null)

  const matchRole = React.useMemo(
    () => openRoles.find((r) => r.id === (matchRoleId ?? assignRoleId)) ?? null,
    [openRoles, matchRoleId, assignRoleId]
  )

  function handleAssigned() {
    router.refresh()
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Available Consultants</span>
              <span className="text-sm font-normal text-muted-foreground">
                {consultants.length} people
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            <AvailabilityBoard
              consultants={consultants}
              onSelect={setSelectedConsultant}
              selectedId={selectedConsultant}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Open Roles</span>
              <span className="text-sm font-normal text-muted-foreground">
                {openRoles.length} unfilled
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            <OpenRoles
              roles={openRoles}
              onMatch={(roleId) => setMatchRoleId(roleId)}
              onAssign={(roleId) => setAssignRoleId(roleId)}
              selectedRoleId={matchRoleId ?? assignRoleId}
            />
          </CardContent>
        </Card>
      </div>

      <SkillMatcher
        roleId={matchRoleId ?? assignRoleId}
        role={matchRole}
        onClose={() => {
          setMatchRoleId(null)
          setAssignRoleId(null)
        }}
        onAssigned={handleAssigned}
      />
    </>
  )
}
