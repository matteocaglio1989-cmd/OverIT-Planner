import { getProfiles } from "@/lib/actions/people"
import { getPendingInvites } from "@/lib/actions/invites"
import { PeopleTable } from "@/components/people/people-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function PeoplePage() {
  const [profiles, pendingInvites] = await Promise.all([
    getProfiles(),
    getPendingInvites(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground mt-2">
            Manage team members and their profiles.
          </p>
        </div>
        <Button disabled>Invite</Button>
      </div>

      {pendingInvites.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {pendingInvites.length} pending {pendingInvites.length === 1 ? "invite" : "invites"}
            </span>
            {" "}&mdash; team members who haven&apos;t accepted yet.
          </p>
          <Link href="/settings?tab=members">
            <Button variant="outline" size="sm">
              View in Settings
            </Button>
          </Link>
        </div>
      )}

      <PeopleTable profiles={profiles} />
    </div>
  )
}
