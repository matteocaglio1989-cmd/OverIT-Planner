"use client"

import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isToday,
  isWeekend,
  getISOWeek,
} from "date-fns"
import { cn } from "@/lib/utils"
import { useTimelineStore, type ZoomLevel } from "@/stores/timeline-store"
import { Button } from "@/components/ui/button"
import type { PublicHoliday } from "@/lib/types/database"

const COLUMN_WIDTHS: Record<ZoomLevel, number> = {
  day: 40,
  week: 60,
  month: 120,
}

interface TimelineHeaderProps {
  holidays: PublicHoliday[]
}

export function TimelineHeader({ holidays }: TimelineHeaderProps) {
  const { zoom, startDate, endDate, navigateBack, navigateForward, goToToday, setZoom } =
    useTimelineStore()

  const holidayDates = new Set(holidays.map((h) => h.date))

  return (
    <div className="flex flex-col border-b bg-background">
      {/* Controls row */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigateBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateForward}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Button>
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {format(startDate, "MMM d, yyyy")} &mdash; {format(endDate, "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          {(["day", "week", "month"] as ZoomLevel[]).map((level) => (
            <Button
              key={level}
              variant={zoom === level ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs capitalize"
              onClick={() => setZoom(level)}
            >
              {level}
            </Button>
          ))}
        </div>
      </div>
      {/* Date columns header */}
      <div className="flex">
        {/* Sidebar spacer */}
        <div className="w-[240px] min-w-[240px] border-r" />
        {/* Scrollable date headers */}
        <div className="overflow-hidden flex-1">
          <DateColumns
            zoom={zoom}
            startDate={startDate}
            endDate={endDate}
            holidayDates={holidayDates}
          />
        </div>
      </div>
    </div>
  )
}

function DateColumns({
  zoom,
  startDate,
  endDate,
  holidayDates,
}: {
  zoom: ZoomLevel
  startDate: Date
  endDate: Date
  holidayDates: Set<string>
}) {
  const colWidth = COLUMN_WIDTHS[zoom]

  if (zoom === "day") {
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    return (
      <div className="flex" style={{ width: days.length * colWidth }}>
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const isHoliday = holidayDates.has(dateStr)
          return (
            <div
              key={dateStr}
              className={cn(
                "flex flex-col items-center justify-center text-xs border-r h-12",
                isToday(day) && "bg-primary/10 font-bold",
                isWeekend(day) && "bg-muted/50",
                isHoliday && "bg-amber-50 dark:bg-amber-950/20"
              )}
              style={{ width: colWidth, minWidth: colWidth }}
            >
              <span className="text-muted-foreground">{format(day, "EEE")}</span>
              <span>{format(day, "d")}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (zoom === "week") {
    const weeks = eachWeekOfInterval(
      { start: startDate, end: endDate },
      { weekStartsOn: 1 }
    )
    return (
      <div className="flex" style={{ width: weeks.length * colWidth }}>
        {weeks.map((week) => {
          const weekNum = getISOWeek(week)
          return (
            <div
              key={format(week, "yyyy-MM-dd")}
              className={cn(
                "flex flex-col items-center justify-center text-xs border-r h-12"
              )}
              style={{ width: colWidth, minWidth: colWidth }}
            >
              <span className="text-muted-foreground">W{weekNum}</span>
              <span>{format(week, "MMM d")}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // month
  const months = eachMonthOfInterval({ start: startDate, end: endDate })
  return (
    <div className="flex" style={{ width: months.length * colWidth }}>
      {months.map((month) => (
        <div
          key={format(month, "yyyy-MM")}
          className="flex flex-col items-center justify-center text-xs border-r h-12"
          style={{ width: colWidth, minWidth: colWidth }}
        >
          <span className="font-medium">{format(month, "MMM yyyy")}</span>
        </div>
      ))}
    </div>
  )
}

export { COLUMN_WIDTHS }
