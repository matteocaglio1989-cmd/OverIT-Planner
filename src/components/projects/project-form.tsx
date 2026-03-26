"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectOption } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { Project, ProjectStatus, Client, Profile } from "@/lib/types/database"
import { createProject, updateProject } from "@/lib/actions/projects"

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
]

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "JPY"]

interface ProjectFormProps {
  project?: Project | null
  clients: Pick<Client, "id" | "name">[]
  profiles: Pick<Profile, "id" | "full_name">[]
  onSuccess?: () => void
  inline?: boolean
}

export function ProjectForm({
  project,
  clients,
  profiles,
  onSuccess,
  inline = false,
}: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [name, setName] = React.useState(project?.name ?? "")
  const [description, setDescription] = React.useState(project?.description ?? "")
  const [clientId, setClientId] = React.useState(project?.client_id ?? "")
  const [status, setStatus] = React.useState<ProjectStatus>(project?.status ?? "tentative")
  const [isBillable, setIsBillable] = React.useState(project?.is_billable ?? true)
  const [startDate, setStartDate] = React.useState(project?.start_date ?? "")
  const [endDate, setEndDate] = React.useState(project?.end_date ?? "")
  const [budgetHours, setBudgetHours] = React.useState(
    project?.budget_hours != null ? String(project.budget_hours) : ""
  )
  const [budgetAmount, setBudgetAmount] = React.useState(
    project?.budget_amount != null ? String(project.budget_amount) : ""
  )
  const [currency, setCurrency] = React.useState(project?.currency ?? "USD")
  const [ownerId, setOwnerId] = React.useState(project?.owner_id ?? "")
  const [color, setColor] = React.useState(project?.color ?? "#6366f1")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        name,
        description: description || null,
        client_id: clientId || null,
        status,
        is_billable: isBillable,
        start_date: startDate || null,
        end_date: endDate || null,
        budget_hours: budgetHours ? Number(budgetHours) : null,
        budget_amount: budgetAmount ? Number(budgetAmount) : null,
        currency,
        owner_id: ownerId || null,
        color,
      }

      if (project) {
        await updateProject(project.id, data)
      } else {
        await createProject(data)
      }

      onSuccess?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="pf-name">
            Project Name *
          </label>
          <Input
            id="pf-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="pf-desc">
            Description
          </label>
          <Textarea
            id="pf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description"
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-client">
            Client
          </label>
          <Select
            id="pf-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <SelectOption value="">No client</SelectOption>
            {clients.map((c) => (
              <SelectOption key={c.id} value={c.id}>
                {c.name}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-status">
            Status
          </label>
          <Select
            id="pf-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <SelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-owner">
            Owner
          </label>
          <Select
            id="pf-owner"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          >
            <SelectOption value="">No owner</SelectOption>
            {profiles.map((p) => (
              <SelectOption key={p.id} value={p.id}>
                {p.full_name}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-2">
            <input
              type="checkbox"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
              className="rounded border-input"
            />
            Billable
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-start">
            Start Date
          </label>
          <Input
            id="pf-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-end">
            End Date
          </label>
          <Input
            id="pf-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-bhours">
            Budget Hours
          </label>
          <Input
            id="pf-bhours"
            type="number"
            min="0"
            step="0.5"
            value={budgetHours}
            onChange={(e) => setBudgetHours(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-bamount">
            Budget Amount
          </label>
          <Input
            id="pf-bamount"
            type="number"
            min="0"
            step="0.01"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-currency">
            Currency
          </label>
          <Select
            id="pf-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <SelectOption key={c} value={c}>
                {c}
              </SelectOption>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="pf-color">
            Color
          </label>
          <div className="flex items-center gap-2">
            <input
              id="pf-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-md border border-input"
            />
            <span className="text-sm text-muted-foreground">{color}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? project
              ? "Saving..."
              : "Creating..."
            : project
              ? "Save Changes"
              : "Create Project"}
        </Button>
      </div>
    </form>
  )
}
