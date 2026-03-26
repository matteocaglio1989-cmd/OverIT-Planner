import { HiBobIntegration } from "@/components/integrations/hibob-integration"

export default function HiBobPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HiBob Integration</h1>
        <p className="text-muted-foreground mt-1">
          Sync your organization&apos;s people, departments, and time-off data from HiBob.
        </p>
      </div>

      <HiBobIntegration />
    </div>
  )
}
