"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/currency"

interface BudgetTrackerProps {
  budgetHours: number | null
  budgetAmount: number | null
  actualHours: number
  actualAmount: number
  currency: string
}

function ProgressBar({
  value,
  max,
  label,
  valueLabel,
}: {
  value: number
  max: number
  label: string
  valueLabel: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const overBudget = max > 0 && value > max

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("text-muted-foreground", overBudget && "text-destructive font-medium")}>
          {valueLabel}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            overBudget ? "bg-destructive" : pct > 80 ? "bg-yellow-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {pct.toFixed(0)}% consumed
        {overBudget && " (over budget)"}
      </p>
    </div>
  )
}

export function BudgetTracker({
  budgetHours,
  budgetAmount,
  actualHours,
  actualAmount,
  currency,
}: BudgetTrackerProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Budget Overview</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Planned Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {budgetHours != null ? `${budgetHours}h` : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Actual Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{actualHours.toFixed(1)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Planned Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {budgetAmount != null
                ? formatCurrency(budgetAmount, currency)
                : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Actual Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(actualAmount, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {budgetHours != null && (
          <Card>
            <CardContent className="pt-6">
              <ProgressBar
                value={actualHours}
                max={budgetHours}
                label="Hours Budget"
                valueLabel={`${actualHours.toFixed(1)}h / ${budgetHours}h`}
              />
            </CardContent>
          </Card>
        )}

        {budgetAmount != null && (
          <Card>
            <CardContent className="pt-6">
              <ProgressBar
                value={actualAmount}
                max={budgetAmount}
                label="Amount Budget"
                valueLabel={`${formatCurrency(actualAmount, currency)} / ${formatCurrency(budgetAmount, currency)}`}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {budgetHours == null && budgetAmount == null && (
        <p className="text-sm text-muted-foreground">
          No budget set for this project. Add budget hours or amount in the project settings to track progress.
        </p>
      )}
    </div>
  )
}
