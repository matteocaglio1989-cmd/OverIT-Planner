import { getDashboardKPIs } from "@/lib/actions/reports"
import { DashboardView } from "@/components/reports/dashboard-view"

export default async function DashboardPage() {
  const kpis = await getDashboardKPIs()

  return <DashboardView kpis={kpis} />
}
