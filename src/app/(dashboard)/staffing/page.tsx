import { requireRole } from "@/lib/auth-guard"
import { getAvailableConsultants, getOpenRoles } from "@/lib/actions/staffing"
import { StaffingView } from "@/components/staffing/staffing-view"

export default async function StaffingPage() {
  await requireRole(["super_admin", "admin", "manager"])
  const [consultants, openRoles] = await Promise.all([
    getAvailableConsultants(),
    getOpenRoles(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staffing</h1>
        <p className="text-muted-foreground mt-2">
          Match consultants to projects based on skills and availability.
        </p>
      </div>
      <StaffingView consultants={consultants} openRoles={openRoles} />
    </div>
  )
}
