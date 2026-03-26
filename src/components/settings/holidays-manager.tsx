"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { createHoliday, deleteHoliday } from "@/lib/actions/settings"
import { Trash2, Plus } from "lucide-react"
import type { PublicHoliday } from "@/lib/types/database"
import { format } from "date-fns"

interface HolidaysManagerProps {
  holidays: PublicHoliday[]
}

export function HolidaysManager({ holidays: initialHolidays }: HolidaysManagerProps) {
  const [holidays, setHolidays] = useState(initialHolidays)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [countryCode, setCountryCode] = useState("IT")
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await createHoliday({ name, date, country_code: countryCode })

    if (!result.error) {
      setHolidays([...holidays, { id: crypto.randomUUID(), name, date, country_code: countryCode, organization_id: null }])
      setName("")
      setDate("")
      setShowForm(false)
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    await deleteHoliday(id)
    setHolidays(holidays.filter((h) => h.id !== id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Public Holidays</CardTitle>
          <CardDescription>Manage public holidays visible on the timeline</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Add Holiday
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleAdd} className="flex gap-3 mb-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="h-name">Name</Label>
              <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Holiday name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="h-date">Date</Label>
              <Input id="h-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="h-country">Country</Label>
              <Input id="h-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="IT" required className="w-20" />
            </div>
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Adding..." : "Add"}
            </Button>
          </form>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No holidays configured
                </TableCell>
              </TableRow>
            )}
            {holidays.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{h.name}</TableCell>
                <TableCell>{format(new Date(h.date), "MMM d, yyyy")}</TableCell>
                <TableCell>{h.country_code}</TableCell>
                <TableCell>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
