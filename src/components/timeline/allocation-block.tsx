"use client"

import { cn } from "@/lib/utils"
import type { Allocation } from "@/lib/types/database"

interface AllocationBlockProps {
  allocation: Allocation & { project?: { name: string; color: string } | null }
  left: number
  width: number
  onClick: () => void
}

export function AllocationBlock({
  allocation,
  left,
  width,
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
      <span className="truncate">{projectName}</span>
      <span className="shrink-0 opacity-80">{allocation.hours_per_day}h</span>
    </button>
  )
}
