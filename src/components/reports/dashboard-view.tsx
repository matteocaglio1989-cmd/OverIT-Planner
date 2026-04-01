"use client"

import { KPICard } from "@/components/reports/kpi-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Activity,
  DollarSign,
  Users,
  FolderKanban,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import type { UserRole } from "@/lib/types/database"

interface DashboardKPIs {
  utilization_rate: number
  utilization_change?: number
  revenue_mtd: number
  revenue_change?: number
  bench_count: number
  active_projects: number
  avg_delivery_margin: number
}

const quickLinks = [
  { name: "Timeline", href: "/timeline", description: "View resource scheduling" },
  { name: "Projects", href: "/projects", description: "Manage projects" },
  { name: "Timesheets", href: "/timesheets", description: "Enter time" },
  { name: "Invoices", href: "/invoices", description: "Manage billing" },
]

const HIDDEN_FOR_CONSULTANT = new Set(["Invoices", "Reports"])

export function DashboardView({ kpis, userRole }: { kpis: DashboardKPIs; userRole: UserRole }) {
  const visibleQuickLinks = userRole === "consultant"
    ? quickLinks.filter((link) => !HIDDEN_FOR_CONSULTANT.has(link.name))
    : quickLinks

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your operations overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Utilization Rate"
          value={`${kpis.utilization_rate.toFixed(0)}%`}
          icon={<Activity className="h-5 w-5" />}
          change={kpis.utilization_change}
        />
        <KPICard
          title="Revenue MTD"
          value={`€${kpis.revenue_mtd.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          change={kpis.revenue_change}
        />
        <KPICard
          title="On Bench"
          value={String(kpis.bench_count)}
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          title="Active Projects"
          value={String(kpis.active_projects)}
          icon={<FolderKanban className="h-5 w-5" />}
        />
        <KPICard
          title="Avg Margin"
          value={`${kpis.avg_delivery_margin.toFixed(0)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleQuickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{link.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{link.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
