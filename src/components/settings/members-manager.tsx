"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectOption } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { updateMemberRole, inviteMember, deactivateUser, reinviteUser } from "@/lib/actions/settings"
import { PendingInvites } from "@/components/settings/pending-invites"
import { UserPlus, RotateCw, Trash2 } from "lucide-react"
import type { UserRole, PendingInvite } from "@/lib/types/database"

interface Member {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

interface MembersManagerProps {
  members: Member[]
  pendingInvites: PendingInvite[]
}

const ROLE_COLORS: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  consultant: "outline",
}

export function MembersManager({ members: initialMembers, pendingInvites }: MembersManagerProps) {
  const [members, setMembers] = useState(initialMembers)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<UserRole>("consultant")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function handleRoleChange(profileId: string, newRole: UserRole) {
    await updateMemberRole(profileId, newRole)
    setMembers(members.map((m) =>
      m.id === profileId ? { ...m, role: newRole } : m
    ))
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const result = await inviteMember(inviteEmail, inviteRole)

    setLoading(false)
    if (result.success) {
      setMessage(result.message ?? "Invitation sent")
      setInviteEmail("")
      setShowInvite(false)
    } else if (result.error) {
      setMessage(`Error: ${result.error}`)
    }
  }

  async function handleReinvite(member: Member) {
    setActionLoading(member.id)
    setMessage(null)
    const result = await reinviteUser(member.email)
    setActionLoading(null)
    if (result.success) {
      setMessage(result.message ?? `Reinvite sent to ${member.email}`)
    } else if (result.error) {
      setMessage(`Error: ${result.error}`)
    }
  }

  async function handleDeactivate() {
    if (!deleteTarget) return
    setActionLoading(deleteTarget.id)
    setMessage(null)
    const result = await deactivateUser(deleteTarget.id)
    setActionLoading(null)
    setDeleteTarget(null)
    if (result.success) {
      setMembers(members.map((m) =>
        m.id === deleteTarget.id ? { ...m, is_active: false } : m
      ))
      setMessage(`${deleteTarget.full_name} has been deactivated.`)
    } else if (result.error) {
      setMessage(`Error: ${result.error}`)
    }
  }

  return (
    <>
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {deleteTarget?.full_name}?</DialogTitle>
            <DialogDescription>
              Are you sure? This will deactivate the user but keep their project staffing data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeactivate} disabled={actionLoading === deleteTarget?.id}>
              {actionLoading === deleteTarget?.id ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PendingInvites invites={pendingInvites} />
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage team members and their roles</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4 mr-1" /> Invite Member
        </Button>
      </CardHeader>
      <CardContent>
        {showInvite && (
          <form onSubmit={handleInvite} className="flex gap-3 mb-4 items-end">
            <div className="space-y-1 flex-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
              >
                <SelectOption value="consultant">Consultant</SelectOption>
                <SelectOption value="manager">Manager</SelectOption>
                <SelectOption value="admin">Admin</SelectOption>
              </Select>
            </div>
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        )}
        {message && (
          <p className="text-sm text-green-600 mb-4">{message}</p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.full_name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_COLORS[member.role]}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={member.is_active ? "default" : "secondary"}>
                    {member.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                    className="w-32"
                  >
                    <SelectOption value="consultant">Consultant</SelectOption>
                    <SelectOption value="manager">Manager</SelectOption>
                    <SelectOption value="admin">Admin</SelectOption>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      </Card>
    </>
  )
}
