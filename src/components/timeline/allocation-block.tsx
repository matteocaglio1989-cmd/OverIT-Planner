"use client"

import { cn } from "@/lib/utils"
import type { Allocation } from "@/lib/types/database"

interface AllocationBlockProps {
  allocation: Allocation & { project?: { name: string; color: string } | null }
  left: number
  width: number
  overflowLeft?: boolean
  overflowRight?: boolean
  onClick: () => void
}

export function AllocationBlock({
  allocation,
  left,
  width,
  overflowLeft,
  overflowRight,
  onClick,
}: AllocationBlockProps) {
  const color = allocation.project?.color || "#6366f1"
  const isTentative = allocation.status === "tentative"
  const projectName = allocation.project?.name || "Unknown"

  return (
    <button
      type="button"
      className={cn(
        "absolute top-1 rounded-md px-1.5 text-xs font-medium text-white truncate cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        "flex items-center gap-1"
      )}
      style={{
        left,
        width: Math.max(width - 2, 16),
        height: 30,
        backgroundColor: isTentative ? "transparent" : color,
        border: isTentative ? `2px dashed ${color}` : "none",
        color: isTentative ? color : "#fff",
        backgroundImage: isTentative
          ? `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 4px,
              ${color}18 4px,
              ${color}18 8px
            )`
          : "none",
      }}
      onClick={onClick}
      title={`${projectName} - ${allocation.hours_per_day}h/day (${allocation.status})`}
    >
      {overflowLeft && (
        <span className="shrink-0 -ml-0.5 mr-0.5 opacity-80" aria-label="continues before">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </span>
      )}
      <span className="truncate">{projectName}</span>
      <span className="shrink-0 opacity-80">{allocation.hours_per_day}h</span>
      {overflowRight && (
        <span className="shrink-0 -mr-0.5 ml-0.5 opacity-80" aria-label="continues after">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </span>
      )}
    </button>
  )
}
