"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { BudgetTracker } from "@/components/projects/budget-tracker"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/currency"
import type {
  Project,
  ProjectPhase,
  ProjectRole,
  Profile,
  TimeEntry,
  Allocation,
} from "@/lib/types/database"

interface ProjectWithDetails extends Project {
  phases: ProjectPhase[]
  roles: (ProjectRole & {
    assigned_profile?: Pick<Profile, "id" | "full_name"> | null
  })[]
  time_entries: TimeEntry[]
  allocations: (Allocation & { profile?: Profile | null })[]
}

interface ProjectFinancialsViewProps {
  project: ProjectWithDetails
}

export function ProjectFinancialsView({ project }: ProjectFinancialsViewProps) {
  const { currency } = project

  // Calculate actual hours
  const actualHours = project.time_entries.reduce((sum, te) => sum + te.hours, 0)

  // Build a map of profile_id -> bill rate from allocations
  const rateByProfile = new Map<string, number>()
  for (const alloc of project.allocations) {
    if (alloc.bill_rate != null) {
      rateByProfile.set(alloc.profile_id, alloc.bill_rate)
    }
  }

  // Calculate revenue (billable hours * bill rate)
  const revenue = project.time_entries.reduce((sum, te) => {
    if (!te.is_billable) return sum
    const rate = rateByProfile.get(te.profile_id) ?? 0
    return sum + te.hours * rate
  }, 0)

  // Calculate cost (all hours * cost rate from profiles in allocations)
  const costRateByProfile = new Map<string, number>()
  for (const alloc of project.allocations) {
    if (alloc.profile?.cost_rate_hourly != null) {
      costRateByProfile.set(alloc.profile_id, alloc.profile.cost_rate_hourly)
    }
  }

  const totalCost = project.time_entries.reduce((sum, te) => {
    const costRate = costRateByProfile.get(te.profile_id) ?? 0
    return sum + te.hours * costRate
  }, 0)

  const margin = revenue - totalCost
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0

  // Actual amount for budget tracker (use revenue)
  const actualAmount = revenue

  return (
    <div className="space-y-8">
      {/* P&L Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Profit &amp; Loss</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(revenue, currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalCost, currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-bold",
                  margin >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatCurrency(margin, currency)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Margin %</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-bold",
                  marginPct >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {marginPct.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Budget Tracker */}
      <BudgetTracker
        budgetHours={project.budget_hours}
        budgetAmount={project.budget_amount}
        actualHours={actualHours}
        actualAmount={actualAmount}
        currency={currency}
      />

      {/* Time Entries Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Time Entries &amp; Costs</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.time_entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No time entries recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              project.time_entries.map((entry) => {
                const billRate = rateByProfile.get(entry.profile_id) ?? 0
                const costRate = costRateByProfile.get(entry.profile_id) ?? 0
                const entryRevenue = entry.is_billable ? entry.hours * billRate : 0
                const entryCost = entry.hours * costRate

                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{entry.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      {entry.hours.toFixed(1)}h
                    </TableCell>
                    <TableCell>
                      {entry.is_billable ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entryRevenue, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entryCost, currency)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
