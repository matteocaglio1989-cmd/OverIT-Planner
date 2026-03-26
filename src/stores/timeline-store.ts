import { create } from "zustand"
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns"

export type ZoomLevel = "day" | "week" | "month"

export interface TimelineFilters {
  team: string | null
  project: string | null
  skill: string | null
  search: string
}

interface TimelineState {
  zoom: ZoomLevel
  startDate: Date
  endDate: Date
  filters: TimelineFilters

  setZoom: (zoom: ZoomLevel) => void
  setDateRange: (start: Date, end: Date) => void
  setFilters: (filters: Partial<TimelineFilters>) => void
  navigateForward: () => void
  navigateBack: () => void
  goToToday: () => void
}

function getDefaultRange(zoom: ZoomLevel): { startDate: Date; endDate: Date } {
  const today = new Date()
  switch (zoom) {
    case "day":
      // Show 4 weeks centered around today
      return {
        startDate: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
        endDate: endOfWeek(addWeeks(today, 2), { weekStartsOn: 1 }),
      }
    case "week":
      // Show 3 months
      return {
        startDate: startOfMonth(subMonths(today, 1)),
        endDate: endOfMonth(addMonths(today, 1)),
      }
    case "month":
      // Show 6 months
      return {
        startDate: startOfMonth(subMonths(today, 2)),
        endDate: endOfMonth(addMonths(today, 3)),
      }
  }
}

export const useTimelineStore = create<TimelineState>((set, get) => {
  const defaultRange = getDefaultRange("week")

  return {
    zoom: "week",
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    filters: {
      team: null,
      project: null,
      skill: null,
      search: "",
    },

    setZoom: (zoom) => {
      const range = getDefaultRange(zoom)
      set({ zoom, startDate: range.startDate, endDate: range.endDate })
    },

    setDateRange: (startDate, endDate) => {
      set({ startDate, endDate })
    },

    setFilters: (filters) => {
      set((state) => ({
        filters: { ...state.filters, ...filters },
      }))
    },

    navigateForward: () => {
      const { zoom, startDate, endDate } = get()
      switch (zoom) {
        case "day":
          set({
            startDate: addWeeks(startDate, 1),
            endDate: addWeeks(endDate, 1),
          })
          break
        case "week":
          set({
            startDate: addMonths(startDate, 1),
            endDate: addMonths(endDate, 1),
          })
          break
        case "month":
          set({
            startDate: addMonths(startDate, 3),
            endDate: addMonths(endDate, 3),
          })
          break
      }
    },

    navigateBack: () => {
      const { zoom, startDate, endDate } = get()
      switch (zoom) {
        case "day":
          set({
            startDate: subWeeks(startDate, 1),
            endDate: subWeeks(endDate, 1),
          })
          break
        case "week":
          set({
            startDate: subMonths(startDate, 1),
            endDate: subMonths(endDate, 1),
          })
          break
        case "month":
          set({
            startDate: subMonths(startDate, 3),
            endDate: subMonths(endDate, 3),
          })
          break
      }
    },

    goToToday: () => {
      const { zoom } = get()
      const range = getDefaultRange(zoom)
      set({ startDate: range.startDate, endDate: range.endDate })
    },
  }
})

// Selector helpers
export const selectDateRangeFormatted = (state: TimelineState) => {
  return `${format(state.startDate, "MMM d, yyyy")} - ${format(state.endDate, "MMM d, yyyy")}`
}
