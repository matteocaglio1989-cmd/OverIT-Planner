"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { exportToCSV } from "@/lib/utils/reports"
import type { UtilizationRow } from "@/lib/actions/reports"

function getBarColor(pct: number): string {
  if (pct > 100) return "#EF4444"
  if (pct >= 80) return "#F59E0B"
  return "#22C55E"
}

interface UtilizationChartProps {
  data: UtilizationRow[]
}

export function UtilizationChart({ data }: UtilizationChartProps) {
  function handleExport() {
    exportToCSV(
      data.map((d) => ({
        Name: d.name,
        "Capacity Hours": d.capacity_hours,
        "Actual Hours": d.actual_hours,
        "Billable Hours": d.billable_hours,
        "Utilization %": d.utilization_pct,
      })),
      "utilization-report"
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Utilization by Person</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No utilization data available.
          </p>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(120, dataMax + 10)]}
                  tickFormatter={(v: number) => `${v}%`}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Utilization"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                />
                <ReferenceLine
                  y={100}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{ value: "100%", position: "right", fontSize: 11 }}
                />
                <ReferenceLine
                  y={80}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{ value: "80%", position: "right", fontSize: 11 }}
                />
                <Bar dataKey="utilization_pct" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={getBarColor(entry.utilization_pct)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
