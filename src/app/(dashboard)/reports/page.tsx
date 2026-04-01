import { requireRole } from "@/lib/auth-guard"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, DollarSign, TrendingUp } from "lucide-react"

const reports = [
  {
    title: "Utilization",
    description: "Track team utilization rates and identify bench time",
    href: "/reports/utilization",
    icon: BarChart3,
  },
  {
    title: "Revenue Forecast",
    description: "Revenue projections based on confirmed and tentative pipeline",
    href: "/reports/revenue",
    icon: DollarSign,
  },
  {
    title: "Profitability",
    description: "Project profitability analysis with margin breakdown",
    href: "/reports/profitability",
    icon: TrendingUp,
  },
]

export default async function ReportsPage() {
  await requireRole(["super_admin", "admin", "manager"])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Analytics and insights for your organization</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <report.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
