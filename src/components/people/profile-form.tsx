"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectOption } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { updateProfile, addSkillToProfile, removeProfileSkill } from "@/lib/actions/people"
import type { Profile, Skill, UserRole } from "@/lib/types/database"

const TAG_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
]

function getTagColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

interface ProfileFormProps {
  profile: Profile
  skills: { skill_id: string; skill_name: string; proficiency_level: number }[]
  allSkills: Skill[]
}

export function ProfileForm({ profile, skills: initialSkills, allSkills: initialAllSkills }: ProfileFormProps) {
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState("")

  // Skill tag state
  const [profileSkills, setProfileSkills] = React.useState(initialSkills)
  const [allSkills, setAllSkills] = React.useState(initialAllSkills)
  const [skillInput, setSkillInput] = React.useState("")
  const [skillLoading, setSkillLoading] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const suggestionsRef = React.useRef<HTMLDivElement>(null)

  const assignedSkillIds = new Set(profileSkills.map((s) => s.skill_id))

  const filteredSuggestions = React.useMemo(() => {
    if (!skillInput.trim()) return []
    const query = skillInput.trim().toLowerCase()
    return allSkills
      .filter(
        (s) =>
          !assignedSkillIds.has(s.id) &&
          s.name.toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [skillInput, allSkills, assignedSkillIds])

  // Reset selected suggestion when suggestions change
  React.useEffect(() => {
    setSelectedSuggestionIndex(-1)
  }, [filteredSuggestions.length])

  async function addSkill(name: string) {
    const trimmed = name.trim().replace(/,+$/, "").trim()
    if (!trimmed) return

    // Check if already assigned (case-insensitive)
    const alreadyAssigned = profileSkills.some(
      (s) => s.skill_name.toLowerCase() === trimmed.toLowerCase()
    )
    if (alreadyAssigned) {
      setSkillInput("")
      setShowSuggestions(false)
      return
    }

    setSkillLoading(true)
    setSkillInput("")
    setShowSuggestions(false)

    try {
      const result = await addSkillToProfile(profile.id, trimmed)
      setProfileSkills((prev) => [
        ...prev,
        { skill_id: result.skill_id, skill_name: result.skill_name, proficiency_level: 3 },
      ])
      // If this was a new skill, add it to allSkills for future autocomplete
      if (!allSkills.some((s) => s.id === result.skill_id)) {
        setAllSkills((prev) => [
          ...prev,
          {
            id: result.skill_id,
            organization_id: null,
            name: result.skill_name,
            category: null,
            created_at: new Date().toISOString(),
          },
        ])
      }
    } catch {
      // Silently handle
    } finally {
      setSkillLoading(false)
      inputRef.current?.focus()
    }
  }

  async function removeSkill(skillId: string) {
    setSkillLoading(true)
    try {
      await removeProfileSkill(profile.id, skillId)
      setProfileSkills((prev) => prev.filter((s) => s.skill_id !== skillId))
    } catch {
      // Silently handle
    } finally {
      setSkillLoading(false)
    }
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1))
      return
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        addSkill(filteredSuggestions[selectedSuggestionIndex].name)
      } else if (skillInput.trim()) {
        addSkill(skillInput)
      }
      return
    }
    if (e.key === "Escape") {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  function handleSkillInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    // If user typed a comma, add the skill immediately
    if (val.includes(",")) {
      const name = val.replace(/,/g, "").trim()
      if (name) addSkill(name)
      return
    }
    setSkillInput(val)
    setShowSuggestions(val.trim().length > 0)
  }

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

          {/* Skills Tag Input Section */}
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2 min-h-[42px]">
              {profileSkills.map((skill) => (
                <Badge
                  key={skill.skill_id}
                  className={`gap-1 pr-1 border ${getTagColor(skill.skill_name)}`}
                >
                  <span>#{skill.skill_name}</span>
                  <button
                    type="button"
                    className="ml-0.5 rounded-sm hover:bg-black/10 p-0.5"
                    onClick={() => removeSkill(skill.skill_id)}
                    disabled={skillLoading}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </Badge>
              ))}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  ref={inputRef}
                  type="text"
                  value={skillInput}
                  onChange={handleSkillInputChange}
                  onKeyDown={handleSkillKeyDown}
                  onFocus={() => {
                    if (skillInput.trim()) setShowSuggestions(true)
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  placeholder={
                    profileSkills.length === 0
                      ? "Type a skill and press Enter..."
                      : "Add another skill..."
                  }
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  disabled={skillLoading}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover p-1 shadow-md"
                  >
                    {filteredSuggestions.map((skill, index) => (
                      <button
                        key={skill.id}
                        type="button"
                        className={`w-full rounded-sm px-2 py-1.5 text-left text-sm ${
                          index === selectedSuggestionIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          addSkill(skill.name)
                        }}
                      >
                        <span className="font-medium">#{skill.name}</span>
                        {skill.category && (
                          <span className="ml-2 text-muted-foreground text-xs">
                            {skill.category}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {skillLoading && (
                <span className="text-xs text-muted-foreground">Adding...</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Type a skill name and press Enter or comma to add. New skills are created automatically.
            </p>
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
