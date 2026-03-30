"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { cancelInvite, resendInvite } from "@/lib/actions/invites"
import { Mail, X } from "lucide-react"
import type { PendingInvite } from "@/lib/types/database"

interface PendingInvitesProps {
  invites: PendingInvite[]
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export function PendingInvites({ invites: initialInvites }: PendingInvitesProps) {
  const [invites, setInvites] = useState(initialInvites)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (invites.length === 0) return null

  async function handleCancel(inviteId: string) {
    setLoadingId(inviteId)
    setMessage(null)
    const result = await cancelInvite(inviteId)
    setLoadingId(null)

    if (result.success) {
      setInvites(invites.filter((i) => i.id !== inviteId))
      setMessage("Invitation cancelled.")
    } else if (result.error) {
      setMessage(`Error: ${result.error}`)
    }
  }

  async function handleResend(inviteId: string) {
    setLoadingId(inviteId)
    setMessage(null)
    const result = await resendInvite(inviteId)
    setLoadingId(null)

    if (result.success) {
      setMessage(result.message ?? "Invitation resent.")
      setInvites(invites.map((i) =>
        i.id === inviteId ? { ...i, invited_at: new Date().toISOString() } : i
      ))
    } else if (result.error) {
      setMessage(`Error: ${result.error}`)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Pending Invitations</CardTitle>
        <CardDescription>
          {invites.length} pending {invites.length === 1 ? "invite" : "invites"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <p className="text-sm text-muted-foreground mb-3">{message}</p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span title={formatDate(invite.invited_at)}>
                    {timeAgo(invite.invited_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Pending</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingId === invite.id}
                      onClick={() => handleResend(invite.id)}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingId === invite.id}
                      onClick={() => handleCancel(invite.id)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
