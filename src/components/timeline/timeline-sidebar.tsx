"use client"

import { Input } from "@/components/ui/input"
import { useTimelineStore } from "@/stores/timeline-store"
import type { Profile } from "@/lib/types/database"
import type { OpenRoleWithProject } from "@/components/timeline/timeline-view"
import { UserSearch } from "lucide-react"

const ROW_HEIGHT = 48

interface TimelineSidebarProps {
  profiles: Profile[]
  openRoles?: OpenRoleWithProject[]
}

export function TimelineSidebar({ profiles, openRoles = [] }: TimelineSidebarProps) {
  const { filters, setFilters } = useTimelineStore()

  return (
    <div className="w-[240px] min-w-[240px] border-r bg-background flex flex-col">
      {/* Search */}
      <div className="p-2 border-b">
        <Input
          placeholder="Search people..."
          className="h-8 text-xs"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
        />
      </div>
      {/* People list */}
      <div className="flex-1 overflow-y-auto">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center gap-2 px-3 border-b hover:bg-muted/50"
            style={{ height: ROW_HEIGHT }}
          >
            {/* Avatar */}
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                getInitials(profile.full_name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {profile.full_name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {profile.job_title || profile.department || "\u2014"}
              </div>
            </div>
          </div>
        ))}
        {profiles.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No people found
          </div>
        )}

        {/* Open Roles Section */}
        {openRoles.length > 0 && (
          <>
            <div
              className="flex items-center gap-2 px-3 bg-amber-50 dark:bg-amber-950/20 border-y border-amber-200 dark:border-amber-800"
              style={{ height: ROW_HEIGHT }}
            >
              <UserSearch className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Unallocated Roles ({openRoles.length})
              </span>
            </div>
            {openRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-center gap-2 px-3 border-b bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60"
                style={{ height: ROW_HEIGHT }}
              >
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0 border-2 border-dashed border-amber-400"
                  style={{ backgroundColor: role.project?.color || "#f59e0b" }}
                >
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {role.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {role.project?.name || "Unknown project"}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export { ROW_HEIGHT }
