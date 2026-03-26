"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectOption } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { updateProfile } from "@/lib/actions/people"
import type { Profile, UserRole } from "@/lib/types/database"

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    const formData = new FormData(e.currentTarget)

    try {
      await updateProfile(profile.id, {
        full_name: formData.get("full_name") as string,
        email: formData.get("email") as string,
        job_title: (formData.get("job_title") as string) || null,
        department: (formData.get("department") as string) || null,
        seniority_level: (formData.get("seniority_level") as string) || null,
        role: formData.get("role") as UserRole,
        cost_rate_hourly: formData.get("cost_rate_hourly")
          ? Number(formData.get("cost_rate_hourly"))
          : null,
        default_bill_rate: formData.get("default_bill_rate")
          ? Number(formData.get("default_bill_rate"))
          : null,
        location: (formData.get("location") as string) || null,
        country_code: (formData.get("country_code") as string) || null,
        weekly_capacity_hours: Number(formData.get("weekly_capacity_hours")) || 40,
      })
      setMessage("Profile updated successfully.")
    } catch {
      setMessage("Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile.email}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                name="job_title"
                defaultValue={profile.job_title ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                defaultValue={profile.department ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seniority_level">Seniority Level</Label>
              <Select
                id="seniority_level"
                name="seniority_level"
                defaultValue={profile.seniority_level ?? ""}
              >
                <SelectOption value="">Select...</SelectOption>
                <SelectOption value="junior">Junior</SelectOption>
                <SelectOption value="mid">Mid</SelectOption>
                <SelectOption value="senior">Senior</SelectOption>
                <SelectOption value="lead">Lead</SelectOption>
                <SelectOption value="principal">Principal</SelectOption>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select id="role" name="role" defaultValue={profile.role}>
                <SelectOption value="consultant">Consultant</SelectOption>
                <SelectOption value="manager">Manager</SelectOption>
                <SelectOption value="admin">Admin</SelectOption>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_rate_hourly">Cost Rate (hourly)</Label>
              <Input
                id="cost_rate_hourly"
                name="cost_rate_hourly"
                type="number"
                step="0.01"
                defaultValue={profile.cost_rate_hourly ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_bill_rate">Default Bill Rate</Label>
              <Input
                id="default_bill_rate"
                name="default_bill_rate"
                type="number"
                step="0.01"
                defaultValue={profile.default_bill_rate ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={profile.location ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code">Country Code</Label>
              <Input
                id="country_code"
                name="country_code"
                maxLength={2}
                placeholder="e.g. US"
                defaultValue={profile.country_code ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekly_capacity_hours">Weekly Capacity (hours)</Label>
              <Input
                id="weekly_capacity_hours"
                name="weekly_capacity_hours"
                type="number"
                defaultValue={profile.weekly_capacity_hours}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {message && (
              <span className="text-sm text-muted-foreground">{message}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
