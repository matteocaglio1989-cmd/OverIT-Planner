"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getAvailabilityForDateRange,
  quickAssign,
} from "@/lib/actions/staffing"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types/database"
import type { OpenRoleWithProject } from "@/components/timeline/timeline-view"

interface RoleAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: OpenRoleWithProject | null
  profiles: Profile[]
  onSuccess?: () => void
}

interface ProfileAvailability {
  profileId: string
  usedFte: number
  availableFte: number
}

interface ProfileSkillInfo {
  id: string
  name: string
  proficiency_level: number
}

export function RoleAssignDialog({
  open,
  onOpenChange,
  role,
  profiles,
  onSuccess,
}: RoleAssignDialogProps) {
  const [showOnlyAvailable, setShowOnlyAvailable] = React.useState(true)
  const [availability, setAvailability] = React.useState<
    Map<string, ProfileAvailability>
  >(new Map())
  const [loadingAvailability, setLoadingAvailability] = React.useState(false)
  const [fteInputs, setFteInputs] = React.useState<Map<string, number>>(
    new Map()
  )
  const [assigningId, setAssigningId] = React.useState<string | null>(null)
  const [profileSkills, setProfileSkills] = React.useState<
    Map<string, ProfileSkillInfo[]>
  >(new Map())

  const roleStartDate =
    role?.start_date || role?.project?.start_date || ""
  const roleEndDate = role?.end_date || role?.project?.end_date || ""
  const roleFte = role?.fte ?? 1.0

  // Fetch availability for all profiles when dialog opens
  React.useEffect(() => {
    if (!open || !role || !roleStartDate || !roleEndDate) {
      setAvailability(new Map())
      return
    }

    let cancelled = false
    setLoadingAvailability(true)

    async function fetchAll() {
      const results = new Map<string, ProfileAvailability>()
      // Fetch in parallel batches
      const promises = profiles.map(async (p) => {
        try {
          const data = await getAvailabilityForDateRange(
            p.id,
            roleStartDate,
            roleEndDate
          )
          return { profileId: p.id, ...data }
        } catch {
          return { profileId: p.id, usedFte: 0, availableFte: 1 }
        }
      })

      const all = await Promise.all(promises)
      if (cancelled) return

      for (const item of all) {
        results.set(item.profileId, item)
      }
      setAvailability(results)
      setLoadingAvailability(false)
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [open, role, roleStartDate, roleEndDate, profiles])

  // Fetch skills for all profiles when dialog opens
  React.useEffect(() => {
    if (!open || profiles.length === 0) {
      setProfileSkills(new Map())
      return
    }

    let cancelled = false

    async function fetchSkills() {
      const supabase = createClient()
      if (!supabase) return

      const profileIds = profiles.map((p) => p.id)
      const { data } = await supabase
        .from("profile_skills")
        .select("profile_id, proficiency_level, skill:skills(id, name)")
        .in("profile_id", profileIds)

      if (cancelled || !data) return

      const map = new Map<string, ProfileSkillInfo[]>()
      for (const ps of data) {
        const skill = ps.skill as unknown as { id: string; name: string } | null
        if (!skill) continue
        const existing = map.get(ps.profile_id) ?? []
        existing.push({
          id: skill.id,
          name: skill.name,
          proficiency_level: ps.proficiency_level,
        })
        map.set(ps.profile_id, existing)
      }
      setProfileSkills(map)
    }

    fetchSkills()
    return () => {
      cancelled = true
    }
  }, [open, profiles])

  // Reset FTE inputs when role changes
  React.useEffect(() => {
    setFteInputs(new Map())
    setShowOnlyAvailable(true)
  }, [role?.id])

  function getFteInput(profileId: string, availableFte: number): number {
    if (fteInputs.has(profileId)) return fteInputs.get(profileId)!
    return Math.min(roleFte, availableFte)
  }

  function setFteInput(profileId: string, value: number) {
    setFteInputs((prev) => {
      const next = new Map(prev)
      next.set(profileId, value)
      return next
    })
  }

  async function handleAssign(profileId: string) {
    if (!role || !roleStartDate || !roleEndDate) return

    const avail = availability.get(profileId)
    const fte = getFteInput(profileId, avail?.availableFte ?? 1)
    // Convert FTE to allocation percentage relative to role FTE
    // quickAssign expects a percentage of the role's FTE
    const allocationPercentage =
      roleFte > 0 ? Math.round((fte / roleFte) * 100) : 100

    setAssigningId(profileId)
    try {
      await quickAssign(
        profileId,
        role.id,
        roleStartDate,
        roleEndDate,
        allocationPercentage
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error("Failed to assign role:", err)
    } finally {
      setAssigningId(null)
    }
  }

  // Filter profiles
  const filteredProfiles = React.useMemo(() => {
    if (!showOnlyAvailable) return profiles
    return profiles.filter((p) => {
      const avail = availability.get(p.id)
      return !avail || avail.availableFte > 0
    })
  }, [profiles, showOnlyAvailable, availability])

  function formatDate(d: string) {
    if (!d) return "--"
    const date = new Date(d + "T00:00:00")
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (!role) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign to Role</DialogTitle>
          <DialogDescription>
            Select a person to assign to this open role.
          </DialogDescription>
        </DialogHeader>

        {/* Role info header */}
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{
                backgroundColor: role.project?.color || "#f59e0b",
              }}
            />
            <span className="font-medium">{role.project?.name}</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              <span className="font-medium text-foreground">
                {role.title}
              </span>
              {" \u2014 "}
              {roleFte} FTE requested
            </div>
            <div>
              {formatDate(roleStartDate)} - {formatDate(roleEndDate)}
            </div>
          </div>
        </div>

        {/* Show only available toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-only-available"
            checked={showOnlyAvailable}
            onChange={(e) => setShowOnlyAvailable(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label
            htmlFor="show-only-available"
            className="text-sm font-medium cursor-pointer select-none"
          >
            Show only available people
          </label>
        </div>

        {/* People list */}
        {loadingAvailability ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading availability...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No {showOnlyAvailable ? "available " : ""}people found.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProfiles.map((profile) => {
              const avail = availability.get(profile.id)
              const availableFte = avail?.availableFte ?? 1
              const usedFte = avail?.usedFte ?? 0
              const fteValue = getFteInput(profile.id, availableFte)
              const isAssigning = assigningId === profile.id

              return (
                <div
                  key={profile.id}
                  className="rounded-md border p-3 flex items-center gap-3"
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      profile.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {profile.full_name}
                      </span>
                      <Badge
                        variant={availableFte > 0 ? "default" : "outline"}
                        className={cn(
                          "text-xs",
                          availableFte > 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        )}
                      >
                        {availableFte} FTE available
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {profile.department || profile.job_title || "--"}
                    </div>
                    {(profileSkills.get(profile.id) ?? []).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(profileSkills.get(profile.id) ?? []).map((skill) => (
                          <Badge
                            key={skill.id}
                            variant="outline"
                            className="text-xs py-0 px-1.5"
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FTE input + Assign button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      max={Math.min(roleFte, 1)}
                      step={0.1}
                      value={fteValue}
                      onChange={(e) => {
                        const val = Math.max(
                          0,
                          Math.min(
                            Math.min(roleFte, 1),
                            Number(e.target.value)
                          )
                        )
                        setFteInput(profile.id, val)
                      }}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      FTE
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleAssign(profile.id)}
                      disabled={isAssigning || fteValue <= 0}
                    >
                      {isAssigning ? "..." : "Assign"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
