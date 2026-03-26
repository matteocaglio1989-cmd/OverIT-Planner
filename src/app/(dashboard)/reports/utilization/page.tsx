import Link from "next/link"
import { getUtilizationData } from "@/lib/actions/reports"
import { UtilizationChart } from "@/components/reports/utilization-chart"
import { UtilizationDataTable } from "@/components/reports/utilization-data-table"
import { Button } from "@/components/ui/button"

export default async function UtilizationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const period = params.period === "quarter" ? "quarter" : "month"

  const data = await getUtilizationData(period)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Utilization Report</h1>
            <p className="text-muted-foreground mt-1">Track team utilization rates</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/reports/utilization?period=month">
            <Button variant={period === "month" ? "default" : "outline"} size="sm">
              This Month
            </Button>
          </Link>
          <Link href="/reports/utilization?period=quarter">
            <Button variant={period === "quarter" ? "default" : "outline"} size="sm">
              This Quarter
            </Button>
          </Link>
        </div>
      </div>

      <UtilizationChart data={data} />
      <UtilizationDataTable data={data} />
    </div>
  )
}
