"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectOption } from "@/components/ui/select"
import type {
  Allocation,
  AllocationStatus,
  Profile,
  Project,
} from "@/lib/types/database"
import {
  createAllocation,
  updateAllocation,
  deleteAllocation,
} from "@/lib/actions/allocations"

interface AllocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allocation: Allocation | null // null = create mode
  profiles: Profile[]
  projects: Project[]
  defaultProfileId?: string
  defaultDate?: string
  onSuccess?: () => void
}

export function AllocationDialog({
  open,
  onOpenChange,
  allocation,
  profiles,
  projects,
  defaultProfileId,
  defaultDate,
  onSuccess,
}: AllocationDialogProps) {
  const isEditing = allocation !== null
  const [isPending, startTransition] = useTransition()

  const [profileId, setProfileId] = useState(
    allocation?.profile_id || defaultProfileId || ""
  )
  const [projectId, setProjectId] = useState(
    allocation?.project_id || ""
  )
  const [startDateVal, setStartDateVal] = useState(
    allocation?.start_date || defaultDate || format(new Date(), "yyyy-MM-dd")
  )
  const [endDateVal, setEndDateVal] = useState(
    allocation?.end_date || defaultDate || format(new Date(), "yyyy-MM-dd")
  )
  const [hoursPerDay, setHoursPerDay] = useState(
    String(allocation?.hours_per_day ?? 8)
  )
  const [status, setStatus] = useState<AllocationStatus>(
    allocation?.status || "tentative"
  )
  const [notes, setNotes] = useState(allocation?.notes || "")
  const [billRate, setBillRate] = useState(
    allocation?.bill_rate != null ? String(allocation.bill_rate) : ""
  )

  // Reset form when allocation changes
  const resetKey = allocation?.id || `${defaultProfileId}-${defaultDate}`

  function handleSave() {
    if (!profileId || !projectId || !startDateVal || !endDateVal) return

    startTransition(async () => {
      try {
        const payload = {
          profile_id: profileId,
          project_id: projectId,
          start_date: startDateVal,
          end_date: endDateVal,
          hours_per_day: parseFloat(hoursPerDay) || 8,
          status,
          notes: notes || null,
          bill_rate: billRate ? parseFloat(billRate) : null,
        }

        if (isEditing && allocation) {
          await updateAllocation(allocation.id, payload)
        } else {
          await createAllocation(payload)
        }

        onOpenChange(false)
        onSuccess?.()
      } catch (err) {
        console.error("Failed to save allocation:", err)
      }
    })
  }

  function handleDelete() {
    if (!allocation) return
    startTransition(async () => {
      try {
        await deleteAllocation(allocation.id)
        onOpenChange(false)
        onSuccess?.()
      } catch (err) {
        console.error("Failed to delete allocation:", err)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Allocation" : "Create Allocation"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the allocation details below."
              : "Fill in the details to create a new allocation."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4" key={resetKey}>
          {/* Profile */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Person</label>
            <Select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              <SelectOption value="">Select person...</SelectOption>
              {profiles.map((p) => (
                <SelectOption key={p.id} value={p.id}>
                  {p.full_name}
                </SelectOption>
              ))}
            </Select>
          </div>

          {/* Project */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Project</label>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <SelectOption value="">Select project...</SelectOption>
              {projects.map((p) => (
                <SelectOption key={p.id} value={p.id}>
                  {p.name}
                </SelectOption>
              ))}
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={startDateVal}
                onChange={(e) => setStartDateVal(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={endDateVal}
                onChange={(e) => setEndDateVal(e.target.value)}
              />
            </div>
          </div>

          {/* Hours per day & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Hours/Day</label>
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as AllocationStatus)
                }
              >
                <SelectOption value="tentative">Tentative</SelectOption>
                <SelectOption value="confirmed">Confirmed</SelectOption>
              </Select>
            </div>
          </div>

          {/* Bill Rate */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">
              Bill Rate (per hour)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={billRate}
              onChange={(e) => setBillRate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Input
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          {isEditing && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
