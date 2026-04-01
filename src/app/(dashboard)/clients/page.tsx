import { requireRole } from "@/lib/auth-guard"
import { getClients } from "@/lib/actions/clients"
import { ClientsTable } from "@/components/clients/clients-table"
import { ClientForm } from "@/components/clients/client-form"

export default async function ClientsPage() {
  await requireRole(["admin", "manager"])
  const clients = await getClients()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-2">
            Manage your client directory.
          </p>
        </div>
        <ClientForm mode="create" />
      </div>

      <ClientsTable clients={clients} />
    </div>
  )
}
