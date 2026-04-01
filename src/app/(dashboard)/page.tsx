import { getDashboardKPIs } from "@/lib/actions/reports"
import { DashboardView } from "@/components/reports/dashboard-view"
import { getCurrentUser } from "@/lib/auth-guard"
import type { UserRole } from "@/lib/types/database"

export default async function DashboardPage() {
  const [kpis, currentUser] = await Promise.all([
    getDashboardKPIs(),
    getCurrentUser(),
  ])

  return <DashboardView kpis={kpis} userRole={currentUser?.role ?? "consultant"} />
}
