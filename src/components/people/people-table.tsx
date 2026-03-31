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
import { Select, SelectOption } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { Profile } from "@/lib/types/database"

interface ProfileWithSkills extends Profile {
  skills: { skill_id: string; skill_name: string; proficiency_level: number }[]
}

interface PeopleTableProps {
  profiles: ProfileWithSkills[]
}

export function PeopleTable({ profiles }: PeopleTableProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("")
  const [departmentFilter, setDepartmentFilter] = React.useState("")

  const departments = React.useMemo(() => {
    const set = new Set<string>()
    profiles.forEach((p) => {
      if (p.department) set.add(p.department)
    })
    return Array.from(set).sort()
  }, [profiles])

  const roles = React.useMemo(() => {
    const set = new Set<string>()
    profiles.forEach((p) => {
      if (p.role) set.add(p.role)
    })
    return Array.from(set).sort()
  }, [profiles])

  const filtered = React.useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch =
        !search ||
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
      const matchesRole = !roleFilter || p.role === roleFilter
      const matchesDept =
        !departmentFilter || p.department === departmentFilter
      return matchesSearch && matchesRole && matchesDept
    })
  }, [profiles, search, roleFilter, departmentFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-40"
        >
          <SelectOption value="">All Roles</SelectOption>
          {roles.map((r) => (
            <SelectOption key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </SelectOption>
          ))}
        </Select>
        <Select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="w-48"
        >
          <SelectOption value="">All Departments</SelectOption>
          {departments.map((d) => (
            <SelectOption key={d} value={d}>
              {d}
            </SelectOption>
          ))}
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Seniority</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead className="text-right">Capacity (h/w)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No team members found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((profile) => (
              <TableRow
                key={profile.id}
                className={`cursor-pointer ${!profile.is_active ? "opacity-50" : ""}`}
                onClick={() => router.push(`/people/${profile.id}`)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {profile.full_name}
                      {!profile.is_active && (
                        <Badge variant="secondary" className="ml-2 text-xs">Deactivated</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {profile.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{profile.department ?? "-"}</TableCell>
                <TableCell>{profile.seniority_level ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.slice(0, 3).map((s) => (
                      <Badge key={s.skill_id} variant="secondary" className="text-xs">
                        {s.skill_name}
                      </Badge>
                    ))}
                    {profile.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{profile.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {profile.weekly_capacity_hours}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
