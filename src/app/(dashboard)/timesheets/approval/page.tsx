import { getPendingTimesheets } from "@/lib/actions/timesheets"
import { ApprovalView } from "@/components/timesheets/approval-view"

export default async function TimesheetApprovalPage() {
  const timesheets = await getPendingTimesheets()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Timesheet Approval
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and approve submitted timesheets.
        </p>
      </div>
      <ApprovalView timesheets={timesheets} />
    </div>
  )
}
