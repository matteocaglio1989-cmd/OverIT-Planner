"use client"

import * as React from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format, parseISO, eachDayOfInterval, endOfWeek } from "date-fns"
import {
  approveTimesheet,
  rejectTimesheet,
} from "@/lib/actions/timesheets"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingTimesheet {
  id: string
  profile_id: string
  week_start: string
  status: string
  submitted_at: string | null
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
    job_title: string | null
  }
  total_hours: number
  entries: {
    date: string
    hours: number
    project: { id: string; name: string } | null
  }[]
}

interface ApprovalQueueProps {
  timesheets: PendingTimesheet[]
  onRefresh?: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApprovalQueue({ timesheets, onRefresh }: ApprovalQueueProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [rejectId, setRejectId] = React.useState<string | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [processing, setProcessing] = React.useState<string | null>(null)

  async function handleApprove(id: string) {
    setProcessing(id)
    try {
      await approveTimesheet(id)
      onRefresh?.()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) return
    setProcessing(rejectId)
    try {
      await rejectTimesheet(rejectId, rejectReason.trim())
      setRejectId(null)
      setRejectReason("")
      onRefresh?.()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  if (timesheets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No timesheets pending approval.
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead>Week</TableHead>
            <TableHead className="text-right">Total Hours</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timesheets.map((ts) => {
            const isExpanded = expandedId === ts.id
            const weekStartDate = parseISO(ts.week_start)
            const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 })
            const days = eachDayOfInterval({
              start: weekStartDate,
              end: weekEndDate,
            })

            // Group entries by date
            const dateMap = new Map<string, { hours: number; projects: string[] }>()
            for (const entry of ts.entries) {
              const existing = dateMap.get(entry.date) ?? {
                hours: 0,
                projects: [],
              }
              existing.hours += entry.hours
              if (entry.project?.name) existing.projects.push(entry.project.name)
              dateMap.set(entry.date, existing)
            }

            return (
              <React.Fragment key={ts.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : ts.id)
                  }
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {ts.profile.full_name}
                      </div>
                      {ts.profile.job_title && (
                        <div className="text-xs text-muted-foreground">
                          {ts.profile.job_title}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(weekStartDate, "MMM d")} -{" "}
                    {format(weekEndDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {ts.total_hours}h
                  </TableCell>
                  <TableCell>
                    {ts.submitted_at
                      ? format(parseISO(ts.submitted_at), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApprove(ts.id)
                        }}
                        disabled={processing === ts.id}
                      >
                        {processing === ts.id ? "..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRejectId(ts.id)
                        }}
                        disabled={processing === ts.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded daily breakdown */}
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/30 px-6 py-3">
                      <div className="grid grid-cols-7 gap-2">
                        {days.map((day) => {
                          const ds = format(day, "yyyy-MM-dd")
                          const data = dateMap.get(ds)
                          return (
                            <div
                              key={ds}
                              className="rounded-md border bg-background p-2 text-center"
                            >
                              <div className="text-xs font-medium text-muted-foreground">
                                {format(day, "EEE")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(day, "MMM d")}
                              </div>
                              <div className="mt-1 text-lg font-semibold">
                                {data?.hours ?? 0}h
                              </div>
                              {data?.projects && data.projects.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {[...new Set(data.projects)].map((name) => (
                                    <div
                                      key={name}
                                      className="truncate text-[10px] text-muted-foreground"
                                    >
                                      {name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectId}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The team member will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectId(null)
                setRejectReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || processing === rejectId}
            >
              {processing === rejectId ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
