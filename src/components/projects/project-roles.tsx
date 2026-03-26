"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectOption } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/currency"
import {
  createProjectRole,
  updateProjectRole,
  deleteProjectRole,
} from "@/lib/actions/projects"
import type { ProjectRole, Profile, RoleDefinition } from "@/lib/types/database"

type RoleWithProfile = Omit<ProjectRole, "assigned_profile"> & {
  assigned_profile?: Pick<Profile, "id" | "full_name"> | null
}

interface ProjectRolesProps {
  projectId: string
  roles: RoleWithProfile[]
  profiles: Pick<Profile, "id" | "full_name">[]
  currency: string
  roleDefinitions?: RoleDefinition[]
}

export function ProjectRoles({
  projectId,
  roles,
  profiles,
  currency,
  roleDefinitions = [],
}: ProjectRolesProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team &amp; Roles</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger>
            <Button size="sm">Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Role</DialogTitle>
            </DialogHeader>
            <RoleFormContent
              projectId={projectId}
              profiles={profiles}
              roleDefinitions={roleDefinitions}
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Bill Rate</TableHead>
            <TableHead>Est. Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No roles added yet.
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.title}</TableCell>
                <TableCell>
                  {role.bill_rate != null
                    ? formatCurrency(role.bill_rate, currency) + "/h"
                    : "-"}
                </TableCell>
                <TableCell>
                  {role.estimated_hours != null ? `${role.estimated_hours}h` : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border",
                      role.is_filled
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-yellow-100 text-yellow-800 border-yellow-200"
                    )}
                  >
                    {role.is_filled ? "Filled" : "Open"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {role.assigned_profile?.full_name ?? "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.required_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {role.required_skills.length === 0 && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Dialog
                      open={editId === role.id}
                      onOpenChange={(open) => setEditId(open ? role.id : null)}
                    >
                      <DialogTrigger>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Role</DialogTitle>
                        </DialogHeader>
                        <RoleFormContent
                          projectId={projectId}
                          role={role}
                          profiles={profiles}
                          roleDefinitions={roleDefinitions}
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
                        if (!confirm("Delete this role?")) return
                        await deleteProjectRole(role.id)
                        router.refresh()
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

// -------------------------------------------------------------------

function RoleFormContent({
  projectId,
  role,
  profiles,
  roleDefinitions,
  loading,
  setLoading,
  onDone,
}: {
  projectId: string
  role?: RoleWithProfile
  profiles: Pick<Profile, "id" | "full_name">[]
  roleDefinitions: RoleDefinition[]
  loading: boolean
  setLoading: (v: boolean) => void
  onDone: () => void
}) {
  const [title, setTitle] = React.useState(role?.title ?? "")
  const [billRate, setBillRate] = React.useState(
    role?.bill_rate != null ? String(role.bill_rate) : ""
  )
  const [estimatedHours, setEstimatedHours] = React.useState(
    role?.estimated_hours != null ? String(role.estimated_hours) : ""
  )
  const [isFilled, setIsFilled] = React.useState(role?.is_filled ?? false)
  const [assignedProfileId, setAssignedProfileId] = React.useState(
    role?.assigned_profile_id ?? ""
  )
  const [skillsInput, setSkillsInput] = React.useState(
    (role?.required_skills ?? []).join(", ")
  )

  function handleRoleSelect(value: string) {
    setTitle(value)
    // Auto-fill bill rate from role definition
    const roleDef = roleDefinitions.find((rd) => rd.name === value)
    if (roleDef?.default_bill_rate != null) {
      setBillRate(String(roleDef.default_bill_rate))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const required_skills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const data = {
        title,
        bill_rate: billRate ? Number(billRate) : null,
        estimated_hours: estimatedHours ? Number(estimatedHours) : null,
        is_filled: isFilled,
        assigned_profile_id: assignedProfileId || null,
        required_skills,
      }

      if (role) {
        await updateProjectRole(role.id, data)
      } else {
        await createProjectRole(projectId, data)
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
        <label className="text-sm font-medium">Role *</label>
        {roleDefinitions.length > 0 ? (
          <Select
            required
            value={title}
            onChange={(e) => handleRoleSelect(e.target.value)}
          >
            <SelectOption value="">Select a role...</SelectOption>
            {roleDefinitions.map((rd) => (
              <SelectOption key={rd.id} value={rd.name}>
                {rd.name}
                {rd.default_bill_rate != null
                  ? ` (${Number(rd.default_bill_rate).toFixed(0)}/h)`
                  : ""}
              </SelectOption>
            ))}
          </Select>
        ) : (
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Role name (define roles in Settings > Roles)"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Bill Rate (per hour)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={billRate}
            onChange={(e) => setBillRate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Estimated Hours</label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Assigned To</label>
        <Select
          value={assignedProfileId}
          onChange={(e) => {
            setAssignedProfileId(e.target.value)
            if (e.target.value) setIsFilled(true)
          }}
        >
          <SelectOption value="">Unassigned</SelectOption>
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
            checked={isFilled}
            onChange={(e) => setIsFilled(e.target.checked)}
            className="rounded border-input"
          />
          Role is filled
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Required Skills (comma-separated)</label>
        <Input
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
          placeholder="React, TypeScript, Node.js"
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : role ? "Save Changes" : "Add Role"}
        </Button>
      </DialogFooter>
    </form>
  )
}
