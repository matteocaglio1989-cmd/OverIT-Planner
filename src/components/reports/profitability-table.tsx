"use client"

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/currency"
import { exportToCSV } from "@/lib/utils/reports"
import type { ProfitabilityRow } from "@/lib/actions/reports"

interface ProfitabilityTableProps {
  data: ProfitabilityRow[]
}

export function ProfitabilityTable({ data }: ProfitabilityTableProps) {
  function handleExport() {
    exportToCSV(
      data.map((d) => ({
        Project: d.project_name,
        Client: d.client_name,
        Revenue: d.revenue,
        Costs: d.costs,
        "Margin Amount": d.margin_amount,
        "Margin %": d.margin_pct,
      })),
      "profitability-report"
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Profitability</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No profitability data available.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Costs</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.project_id}>
                  <TableCell className="font-medium">
                    {row.project_name}
                  </TableCell>
                  <TableCell>{row.client_name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.costs)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      row.margin_amount >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {formatCurrency(row.margin_amount)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      row.margin_pct >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {row.margin_pct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
