"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectOption } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/currency"
import type { Project, ProjectStatus } from "@/lib/types/database"

const STATUS_OPTIONS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
]

const STATUS_COLORS: Record<ProjectStatus, string> = {
  tentative: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-800 border-gray-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
}

function formatStatus(status: ProjectStatus): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

interface ProjectWithRelations extends Omit<Project, 'client' | 'owner'> {
  client?: { id: string; name: string } | null
  owner?: { id: string; full_name: string } | null
}

interface ProjectsTableProps {
  projects: ProjectWithRelations[]
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<ProjectStatus | "all">("all")

  const filtered = React.useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (!search) return true
      const term = search.toLowerCase()
      return p.name.toLowerCase().includes(term)
    })
  }, [projects, search, statusFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "all")}
          className="w-[180px]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <SelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead className="text-right">Budget</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground py-8"
              >
                No projects found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="font-medium">{project.name}</span>
                  </div>
                </TableCell>
                <TableCell>{project.client?.name ?? "-"}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border",
                      STATUS_COLORS[project.status]
                    )}
                  >
                    {formatStatus(project.status)}
                  </Badge>
                </TableCell>
                <TableCell>{project.owner?.full_name ?? "-"}</TableCell>
                <TableCell>
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  {project.end_date
                    ? new Date(project.end_date).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {project.budget_amount != null
                    ? formatCurrency(project.budget_amount, project.currency)
                    : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
