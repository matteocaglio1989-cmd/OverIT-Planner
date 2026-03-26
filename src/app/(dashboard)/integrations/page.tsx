import { IntegrationsGrid } from "@/components/integrations/integrations-grid"

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect external services to sync data with OverIT Planner.
        </p>
      </div>

      <IntegrationsGrid />
    </div>
  )
}
