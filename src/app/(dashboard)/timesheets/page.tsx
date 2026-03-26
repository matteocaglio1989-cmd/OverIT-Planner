import { startOfWeek, format } from "date-fns"
import {
  getCurrentProfileId,
  getTimeEntries,
  getPlannedHours,
  getTimesheetPeriod,
  getUserProjects,
} from "@/lib/actions/timesheets"
import { TimesheetView } from "@/components/timesheets/timesheet-view"

export default async function TimesheetsPage() {
  const profileId = await getCurrentProfileId()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekStartStr = format(weekStart, "yyyy-MM-dd")

  const [entries, planned, period, projects] = await Promise.all([
    getTimeEntries(profileId, weekStartStr),
    getPlannedHours(profileId, weekStartStr),
    getTimesheetPeriod(profileId, weekStartStr),
    getUserProjects(profileId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
        <p className="text-muted-foreground mt-2">
          Track your time across projects.
        </p>
      </div>
      <TimesheetView
        profileId={profileId}
        initialWeekStart={weekStartStr}
        initialEntries={entries}
        initialPlanned={planned}
        initialPeriod={period}
        initialProjects={projects}
      />
    </div>
  )
}
