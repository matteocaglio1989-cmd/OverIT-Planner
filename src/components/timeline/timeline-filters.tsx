"use client"

import { useMemo } from "react"
import { Select, SelectOption } from "@/components/ui/select"
import { useTimelineStore } from "@/stores/timeline-store"
import type { Profile, Project, Skill } from "@/lib/types/database"

interface TimelineFiltersProps {
  profiles: Profile[]
  projects: Project[]
  skills: Skill[]
}

export function TimelineFilters({
  profiles,
  projects,
  skills,
}: TimelineFiltersProps) {
  const { filters, setFilters } = useTimelineStore()

  const departments = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) {
      if (p.department) set.add(p.department)
    }
    return Array.from(set).sort()
  }, [profiles])

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Filters
      </span>

      {/* Project filter */}
      <Select
        className="h-8 text-xs w-[180px]"
        value={filters.project || ""}
        onChange={(e) =>
          setFilters({ project: e.target.value || null })
        }
      >
        <SelectOption value="">All Projects</SelectOption>
        {projects.map((p) => (
          <SelectOption key={p.id} value={p.id}>
            {p.name}
          </SelectOption>
        ))}
      </Select>

      {/* Team / Department filter */}
      <Select
        className="h-8 text-xs w-[180px]"
        value={filters.team || ""}
        onChange={(e) =>
          setFilters({ team: e.target.value || null })
        }
      >
        <SelectOption value="">All Teams</SelectOption>
        {departments.map((d) => (
          <SelectOption key={d} value={d}>
            {d}
          </SelectOption>
        ))}
      </Select>

      {/* Skill filter */}
      <Select
        className="h-8 text-xs w-[180px]"
        value={filters.skill || ""}
        onChange={(e) =>
          setFilters({ skill: e.target.value || null })
        }
      >
        <SelectOption value="">All Skills</SelectOption>
        {skills.map((s) => (
          <SelectOption key={s.id} value={s.id}>
            {s.name}
          </SelectOption>
        ))}
      </Select>

      {(filters.project || filters.team || filters.skill) && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() =>
            setFilters({ project: null, team: null, skill: null })
          }
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
