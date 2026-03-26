"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { getSkillMatches, quickAssign } from "@/lib/actions/staffing"
import type { SkillMatch, OpenRoleWithProject } from "@/lib/actions/staffing"

interface SkillMatcherProps {
  roleId: string | null
  role?: OpenRoleWithProject | null
  onClose: () => void
  onAssigned?: () => void
}

export function SkillMatcher({
  roleId,
  role,
  onClose,
  onAssigned,
}: SkillMatcherProps) {
  const [matches, setMatches] = React.useState<SkillMatch[]>([])
  const [loading, setLoading] = React.useState(false)
  const [assignDialog, setAssignDialog] = React.useState<{
    profileId: string
    profileName: string
  } | null>(null)
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [assigning, setAssigning] = React.useState(false)

  React.useEffect(() => {
    if (!roleId) {
      setMatches([])
      return
    }
    setLoading(true)
    getSkillMatches(roleId)
      .then((data) => setMatches(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [roleId])

  React.useEffect(() => {
    if (role?.project?.start_date) setStartDate(role.project.start_date)
    if (role?.project?.end_date) setEndDate(role.project.end_date)
  }, [role])

  async function handleAssign() {
    if (!assignDialog || !roleId || !startDate || !endDate) return
    setAssigning(true)
    try {
      await quickAssign(assignDialog.profileId, roleId, startDate, endDate)
      setAssignDialog(null)
      onAssigned?.()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setAssigning(false)
    }
  }

  if (!roleId) return null

  return (
    <>
      <Dialog open={!!roleId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Matching Consultants
              {role && (
                <span className="block text-sm font-normal text-muted-foreground">
                  {role.project?.name} - {role.title}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Consultants ranked by skill match percentage and availability.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading matches...
            </div>
          ) : matches.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No matching consultants found.
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <Card key={match.profile.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">
                            {match.profile.full_name}
                          </h4>
                          <Badge
                            variant={
                              match.match_percentage === 100
                                ? "default"
                                : match.match_percentage >= 50
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {match.match_percentage}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {match.profile.job_title || match.profile.role}
                          {" - "}
                          {match.allocation_percentage}% utilized
                        </p>
                        {match.matched_skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {match.matched_skills.map((skill) => (
                              <Badge
                                key={skill}
                                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {match.missing_skills.map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="text-xs text-muted-foreground line-through"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          setAssignDialog({
                            profileId: match.profile.id,
                            profileName: match.profile.full_name,
                          })
                        }
                      >
                        Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!assignDialog}
        onOpenChange={(open) => !open && setAssignDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Assign</DialogTitle>
            <DialogDescription>
              Assign {assignDialog?.profileName} to{" "}
              {role?.title} on {role?.project?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialog(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !startDate || !endDate}
            >
              {assigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
