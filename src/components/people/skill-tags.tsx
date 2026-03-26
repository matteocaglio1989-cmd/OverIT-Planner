"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectOption } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { addProfileSkill, removeProfileSkill } from "@/lib/actions/people"
import type { Skill } from "@/lib/types/database"

interface SkillTagsProps {
  profileId: string
  profileSkills: {
    skill_id: string
    skill_name: string
    proficiency_level: number
  }[]
  allSkills: Skill[]
}

const proficiencyLabels: Record<number, string> = {
  1: "Beginner",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert",
}

export function SkillTags({ profileId, profileSkills, allSkills }: SkillTagsProps) {
  const [adding, setAdding] = React.useState(false)
  const [selectedSkillId, setSelectedSkillId] = React.useState("")
  const [proficiency, setProficiency] = React.useState("3")
  const [loading, setLoading] = React.useState(false)

  const assignedSkillIds = new Set(profileSkills.map((s) => s.skill_id))
  const availableSkills = allSkills.filter((s) => !assignedSkillIds.has(s.id))

  async function handleAdd() {
    if (!selectedSkillId) return
    setLoading(true)
    try {
      await addProfileSkill(profileId, selectedSkillId, Number(proficiency))
      setSelectedSkillId("")
      setProficiency("3")
      setAdding(false)
    } catch {
      // error handled silently
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(skillId: string) {
    setLoading(true)
    try {
      await removeProfileSkill(profileId, skillId)
    } catch {
      // error handled silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Skills</CardTitle>
          {!adding && availableSkills.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              Add Skill
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {profileSkills.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No skills assigned yet.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {profileSkills.map((skill) => (
            <Badge
              key={skill.skill_id}
              variant="secondary"
              className="gap-1.5 pr-1"
            >
              <span>{skill.skill_name}</span>
              <span className="text-muted-foreground">
                ({proficiencyLabels[skill.proficiency_level] ?? skill.proficiency_level})
              </span>
              <button
                type="button"
                className="ml-1 rounded-sm hover:bg-muted p-0.5"
                onClick={() => handleRemove(skill.skill_id)}
                disabled={loading}
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
        </div>

        {adding && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Skill</label>
              <Select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="w-48"
              >
                <SelectOption value="">Select a skill...</SelectOption>
                {availableSkills.map((s) => (
                  <SelectOption key={s.id} value={s.id}>
                    {s.name}
                    {s.category ? ` (${s.category})` : ""}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Proficiency</label>
              <Select
                value={proficiency}
                onChange={(e) => setProficiency(e.target.value)}
                className="w-40"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectOption key={n} value={String(n)}>
                    {n} - {proficiencyLabels[n]}
                  </SelectOption>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={loading || !selectedSkillId}>
                {loading ? "Adding..." : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false)
                  setSelectedSkillId("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
