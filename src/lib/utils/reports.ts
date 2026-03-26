/**
 * Utility functions for reporting
 */

export function calculateUtilization(
  actualHours: number,
  capacityHours: number
): number {
  if (capacityHours <= 0) return 0
  return Math.round((actualHours / capacityHours) * 100)
}

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows: string[] = []

  // Header row
  csvRows.push(headers.map((h) => `"${h}"`).join(","))

  // Data rows
  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ""
      if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`
      return String(val)
    })
    csvRows.push(values.join(","))
  }

  const csvContent = csvRows.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
