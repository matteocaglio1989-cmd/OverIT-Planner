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
import { cn } from "@/lib/utils"
import type { UtilizationRow } from "@/lib/actions/reports"

interface UtilizationDataTableProps {
  data: UtilizationRow[]
}

export function UtilizationDataTable({ data }: UtilizationDataTableProps) {
  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilization Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="text-right">Capacity (h)</TableHead>
              <TableHead className="text-right">Actual (h)</TableHead>
              <TableHead className="text-right">Billable (h)</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.profile_id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right">{row.capacity_hours}</TableCell>
                <TableCell className="text-right">{row.actual_hours}</TableCell>
                <TableCell className="text-right">{row.billable_hours}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    row.utilization_pct > 100
                      ? "text-red-600"
                      : row.utilization_pct >= 80
                        ? "text-amber-600"
                        : "text-green-600"
                  )}
                >
                  {row.utilization_pct}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
