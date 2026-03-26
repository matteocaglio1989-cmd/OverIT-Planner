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
import { formatCurrency } from "@/lib/utils/currency"
import type { RevenueRow } from "@/lib/actions/reports"

interface RevenueDataTableProps {
  data: RevenueRow[]
}

export function RevenueDataTable({ data }: RevenueDataTableProps) {
  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Confirmed</TableHead>
              <TableHead className="text-right">Tentative</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">{row.month}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.confirmed)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(row.tentative)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(row.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
