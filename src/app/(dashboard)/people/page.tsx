import { getProfiles } from "@/lib/actions/people"
import { getPendingInvites } from "@/lib/actions/invites"
import { PeopleTable } from "@/components/people/people-table"
import { PendingInvites } from "@/components/settings/pending-invites"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth-guard"

export default async function PeoplePage() {
  const [profiles, pendingInvites, currentUser] = await Promise.all([
    getProfiles(),
    getPendingInvites(),
    getCurrentUser(),
  ])

  const isConsultant = currentUser?.role === "consultant"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground mt-2">
            Manage team members and their profiles.
          </p>
        </div>
        {!isConsultant && <Button disabled>Invite</Button>}
      </div>

      {!isConsultant && pendingInvites.length > 0 && (
        <PendingInvites invites={pendingInvites} />
      )}

      <PeopleTable profiles={profiles} />
    </div>
  )
}
