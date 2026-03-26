import { getProfiles } from "@/lib/actions/people"
import { PeopleTable } from "@/components/people/people-table"
import { Button } from "@/components/ui/button"

export default async function PeoplePage() {
  const profiles = await getProfiles()

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

      <PeopleTable profiles={profiles} />
    </div>
  )
}
