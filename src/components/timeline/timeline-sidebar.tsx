"use client"

import { Input } from "@/components/ui/input"
import { useTimelineStore } from "@/stores/timeline-store"
import type { Profile } from "@/lib/types/database"

const ROW_HEIGHT = 48

interface TimelineSidebarProps {
  profiles: Profile[]
}

export function TimelineSidebar({ profiles }: TimelineSidebarProps) {
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
