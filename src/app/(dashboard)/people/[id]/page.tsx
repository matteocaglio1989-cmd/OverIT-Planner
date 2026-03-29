import { notFound } from "next/navigation"
import { getProfile } from "@/lib/actions/people"
import { getSkills } from "@/lib/actions/skills"
import { ProfileForm } from "@/components/people/profile-form"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [profile, allSkills] = await Promise.all([getProfile(id), getSkills()])

  if (!profile) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {profile.full_name}
        </h1>
        <p className="text-muted-foreground mt-2">
          {profile.job_title ?? "Team Member"}
          {profile.department ? ` - ${profile.department}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProfileForm
            profile={profile}
            skills={profile.skills}
            allSkills={allSkills}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Weekly Capacity
                  </span>
                  <span className="font-medium">
                    {profile.weekly_capacity_hours}h
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Current Utilization
                  </span>
                  <span className="font-medium text-muted-foreground">
                    -- %
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Allocated Hours
                  </span>
                  <span className="font-medium text-muted-foreground">
                    --h
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Utilization data will be available once allocations are
                  configured.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="capitalize">{profile.role}</span>
                </div>
                {profile.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.country_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Country</span>
                    <span>{profile.country_code}</span>
                  </div>
                )}
                {profile.cost_rate_hourly != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cost Rate</span>
                    <span>${profile.cost_rate_hourly}/h</span>
                  </div>
                )}
                {profile.default_bill_rate != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bill Rate</span>
                    <span>${profile.default_bill_rate}/h</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
