import Link from "next/link"
import { getRevenueData } from "@/lib/actions/reports"
import { RevenueChart } from "@/components/reports/revenue-chart"
import { RevenueDataTable } from "@/components/reports/revenue-data-table"
import { Button } from "@/components/ui/button"

export default async function RevenueForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const period = params.period === "12m" ? "12m" : "6m"

  const data = await getRevenueData(period)

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
            <h1 className="text-3xl font-bold tracking-tight">Revenue Forecast</h1>
            <p className="text-muted-foreground mt-1">Revenue projections and trends</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/reports/revenue?period=6m">
            <Button variant={period === "6m" ? "default" : "outline"} size="sm">
              6 Months
            </Button>
          </Link>
          <Link href="/reports/revenue?period=12m">
            <Button variant={period === "12m" ? "default" : "outline"} size="sm">
              12 Months
            </Button>
          </Link>
        </div>
      </div>

      <RevenueChart data={data} />
      <RevenueDataTable data={data} />
    </div>
  )
}
