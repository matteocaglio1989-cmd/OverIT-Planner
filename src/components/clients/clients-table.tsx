"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import type { Client } from "@/lib/types/database"

interface ClientWithCount extends Client {
  projects_count: number
}

interface ClientsTableProps {
  clients: ClientWithCount[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    return clients.filter((c) => {
      if (!search) return true
      const term = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(term) ||
        (c.contact_name && c.contact_name.toLowerCase().includes(term)) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(term))
      )
    })
  }, [clients, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">Projects</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-8"
              >
                No clients found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <TableCell>
                  <span className="font-medium">{client.name}</span>
                </TableCell>
                <TableCell>{client.contact_name ?? "-"}</TableCell>
                <TableCell>{client.contact_email ?? "-"}</TableCell>
                <TableCell>{client.default_currency}</TableCell>
                <TableCell className="text-right">
                  {client.projects_count}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
