import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format,
} from "date-fns"
import { getProfiles } from "@/lib/actions/people"
import { getProjects } from "@/lib/actions/projects"
import { getSkills } from "@/lib/actions/skills"
import {
  getAllocations,
  getAbsences,
  getHolidays,
} from "@/lib/actions/allocations"
import { getOpenRoles } from "@/lib/actions/staffing"
import { TimelineView } from "@/components/timeline/timeline-view"
import { getCurrentUser } from "@/lib/auth-guard"

export default async function TimelinePage() {
  const currentUser = await getCurrentUser()
  const isConsultant = currentUser?.role === "consultant"
  const today = new Date()
  const rangeStart = startOfMonth(subMonths(today, 1))
  const rangeEnd = endOfMonth(addMonths(today, 1))
  const startStr = format(rangeStart, "yyyy-MM-dd")
  const endStr = format(rangeEnd, "yyyy-MM-dd")

  const [profiles, projects, skills, allocations, absences, holidays, openRoles] =
    await Promise.all([
      getProfiles(),
      getProjects(),
      getSkills(),
      getAllocations(startStr, endStr),
      getAbsences(startStr, endStr),
      getHolidays(startStr, endStr),
      getOpenRoles(),
    ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground mt-1">
          Resource scheduling and allocation timeline.
        </p>
      </div>

      <TimelineView
        initialProfiles={profiles}
        initialAllocations={allocations}
        initialAbsences={absences}
        initialHolidays={holidays}
        projects={projects}
        skills={skills}
        initialOpenRoles={openRoles}
        readOnly={isConsultant}
      />
    </div>
  )
}
