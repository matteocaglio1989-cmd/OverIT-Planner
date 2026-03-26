"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  isThisWeek,
} from "date-fns"

interface WeekNavigatorProps {
  weekStart: Date
  onChange: (weekStart: Date) => void
}

export function WeekNavigator({ weekStart, onChange }: WeekNavigatorProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  const label = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`

  const isCurrent = isThisWeek(weekStart, { weekStartsOn: 1 })

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(subWeeks(weekStart, 1))}
        aria-label="Previous week"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Button>

      <span className="min-w-[200px] text-center text-sm font-medium">
        {label}
      </span>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(addWeeks(weekStart, 1))}
        aria-label="Next week"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Button>

      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange(startOfWeek(new Date(), { weekStartsOn: 1 }))
          }
        >
          This Week
        </Button>
      )}
    </div>
  )
}
