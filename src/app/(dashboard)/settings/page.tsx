import { requireRole } from "@/lib/auth-guard"
import { getOrganization, getHolidays, getOrgMembers } from "@/lib/actions/settings"
import { getPendingInvites } from "@/lib/actions/invites"
import { OrgSettingsForm } from "@/components/settings/org-settings-form"
import { HolidaysManager } from "@/components/settings/holidays-manager"
import { MembersManager } from "@/components/settings/members-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function SettingsPage() {
  await requireRole(["admin", "manager"])
  const [organization, holidays, members, pendingInvites] = await Promise.all([
    getOrganization(),
    getHolidays(),
    getOrgMembers(),
    getPendingInvites(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          {organization ? (
            <OrgSettingsForm organization={organization} />
          ) : (
            <p className="text-muted-foreground">No organization found. Please sign up first.</p>
          )}
        </TabsContent>

        <TabsContent value="holidays" className="mt-6">
          <HolidaysManager holidays={holidays} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MembersManager members={members} pendingInvites={pendingInvites} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
