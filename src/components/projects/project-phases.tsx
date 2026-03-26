"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils/currency"
import { createPhase, updatePhase, deletePhase } from "@/lib/actions/projects"
import type { ProjectPhase } from "@/lib/types/database"

interface ProjectPhasesProps {
  projectId: string
  phases: ProjectPhase[]
  currency: string
}

export function ProjectPhases({ projectId, phases, currency }: ProjectPhasesProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const sorted = React.useMemo(
    () => [...phases].sort((a, b) => a.sort_order - b.sort_order),
    [phases]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Phases</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger>
            <Button size="sm">Add Phase</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Phase</DialogTitle>
            </DialogHeader>
            <PhaseFormContent
              projectId={projectId}
              nextOrder={sorted.length > 0 ? sorted[sorted.length - 1].sort_order + 1 : 0}
              loading={loading}
              setLoading={setLoading}
              onDone={() => {
                setAddOpen(false)
                router.refresh()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No phases added yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((phase) => (
            <Card key={phase.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{phase.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Dialog
                      open={editId === phase.id}
                      onOpenChange={(open) => setEditId(open ? phase.id : null)}
                    >
                      <DialogTrigger>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Phase</DialogTitle>
                        </DialogHeader>
                        <PhaseFormContent
                          projectId={projectId}
                          phase={phase}
                          loading={loading}
                          setLoading={setLoading}
                          onDone={() => {
                            setEditId(null)
                            router.refresh()
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={async () => {
                        if (!confirm("Delete this phase?")) return
                        await deletePhase(phase.id)
                        router.refresh()
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    Start:{" "}
                    {phase.start_date
                      ? new Date(phase.start_date).toLocaleDateString()
                      : "-"}
                  </span>
                  <span>
                    End:{" "}
                    {phase.end_date
                      ? new Date(phase.end_date).toLocaleDateString()
                      : "-"}
                  </span>
                  {phase.budget_hours != null && (
                    <span>Hours: {phase.budget_hours}h</span>
                  )}
                  {phase.budget_amount != null && (
                    <span>Budget: {formatCurrency(phase.budget_amount, currency)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------

function PhaseFormContent({
  projectId,
  phase,
  nextOrder,
  loading,
  setLoading,
  onDone,
}: {
  projectId: string
  phase?: ProjectPhase
  nextOrder?: number
  loading: boolean
  setLoading: (v: boolean) => void
  onDone: () => void
}) {
  const [name, setName] = React.useState(phase?.name ?? "")
  const [startDate, setStartDate] = React.useState(phase?.start_date ?? "")
  const [endDate, setEndDate] = React.useState(phase?.end_date ?? "")
  const [budgetHours, setBudgetHours] = React.useState(
    phase?.budget_hours != null ? String(phase.budget_hours) : ""
  )
  const [budgetAmount, setBudgetAmount] = React.useState(
    phase?.budget_amount != null ? String(phase.budget_amount) : ""
  )
  const [sortOrder, setSortOrder] = React.useState(
    String(phase?.sort_order ?? nextOrder ?? 0)
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        name,
        start_date: startDate || null,
        end_date: endDate || null,
        budget_hours: budgetHours ? Number(budgetHours) : null,
        budget_amount: budgetAmount ? Number(budgetAmount) : null,
        sort_order: Number(sortOrder),
      }
      if (phase) {
        await updatePhase(phase.id, data)
      } else {
        await createPhase(projectId, data)
      }
      onDone()
    } catch {
      // errors handled silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Name *</label>
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Budget Hours</label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={budgetHours}
            onChange={(e) => setBudgetHours(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Budget Amount</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Sort Order</label>
          <Input
            type="number"
            min="0"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : phase ? "Save Changes" : "Add Phase"}
        </Button>
      </DialogFooter>
    </form>
  )
}
