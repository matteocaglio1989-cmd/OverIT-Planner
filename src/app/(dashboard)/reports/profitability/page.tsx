import Link from "next/link"
import { getProfitabilityData } from "@/lib/actions/reports"
import { ProfitabilityTable } from "@/components/reports/profitability-table"
import { Button } from "@/components/ui/button"

export default async function ProfitabilityPage() {
  const data = await getProfitabilityData()

  return (
    <div className="space-y-6">
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
          <h1 className="text-3xl font-bold tracking-tight">Profitability</h1>
          <p className="text-muted-foreground mt-1">Project profitability analysis</p>
        </div>
      </div>

      <ProfitabilityTable data={data} />
    </div>
  )
}
