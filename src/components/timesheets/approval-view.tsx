"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ApprovalQueue } from "./approval-queue"
import type { Profile, TimesheetPeriod } from "@/lib/types/database"

interface PendingTimesheet extends TimesheetPeriod {
  profile: Pick<Profile, "id" | "full_name" | "avatar_url" | "job_title">
  total_hours: number
  entries: {
    date: string
    hours: number
    project: { id: string; name: string } | null
  }[]
}

interface ApprovalViewProps {
  timesheets: PendingTimesheet[]
}

export function ApprovalView({ timesheets }: ApprovalViewProps) {
  const router = useRouter()

  function handleRefresh() {
    router.refresh()
  }

  return <ApprovalQueue timesheets={timesheets} onRefresh={handleRefresh} />
}
