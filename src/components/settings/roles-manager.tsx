"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import type { RoleDefinition } from "@/lib/types/database"
import {
  createRoleDefinition,
  updateRoleDefinition,
  deleteRoleDefinition,
  syncRolesFromProjects,
} from "@/lib/actions/role-definitions"

interface RolesManagerProps {
  roleDefinitions: RoleDefinition[]
}

export function RolesManager({ roleDefinitions }: RolesManagerProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  function handleEdit(role: RoleDefinition) {
    setEditingRole(role)
    setDialogOpen(true)
  }

  function handleAdd() {
    setEditingRole(null)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this role definition?")) return
    await deleteRoleDefinition(id)
    router.refresh()
  }

  function handleSuccess() {
    setDialogOpen(false)
    setEditingRole(null)
    router.refresh()
  }

  async function handleSyncFromProjects() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncRolesFromProjects()
      setSyncResult(
        result.imported > 0
          ? `Imported ${result.imported} role${result.imported > 1 ? "s" : ""} from projects${result.skipped > 0 ? ` (${result.skipped} already existed)` : ""}.`
          : "No new roles to import — all project roles already have definitions."
      )
      router.refresh()
    } catch {
      setSyncResult("Failed to sync roles from projects.")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground mt-1">
            Define roles with preset bill rates. These roles appear as options when staffing projects.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncFromProjects} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Import from Projects"}
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
      </div>

      {syncResult && (
        <div className="rounded-md bg-muted p-3 text-sm">
          {syncResult}
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Default Bill Rate</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roleDefinitions.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>
                  {role.default_bill_rate != null
                    ? `${Number(role.default_bill_rate).toFixed(2)} /h`
                    : "\u2014"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {role.description || "\u2014"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(role)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {roleDefinitions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No roles defined yet. Click &quot;Add Role&quot; to create your first role.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Add Role"}
            </DialogTitle>
          </DialogHeader>
          <RoleForm
            role={editingRole}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RoleForm({
  role,
  onSuccess,
}: {
  role: RoleDefinition | null
  onSuccess: () => void
}) {
  const [name, setName] = useState(role?.name ?? "")
  const [billRate, setBillRate] = useState(
    role?.default_bill_rate != null ? String(role.default_bill_rate) : ""
  )
  const [description, setDescription] = useState(role?.description ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        name,
        default_bill_rate: billRate ? Number(billRate) : null,
        description: description || null,
      }

      if (role) {
        await updateRoleDefinition(role.id, data)
      } else {
        await createRoleDefinition(data)
      }

      onSuccess()
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Role Name *</label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Project Manager, Business Analyst"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Default Bill Rate (/h)</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={billRate}
          onChange={(e) => setBillRate(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of this role"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : role ? "Save Changes" : "Add Role"}
        </Button>
      </div>
    </form>
  )
}
