import { requireRole } from "@/lib/auth-guard"
import { notFound } from "next/navigation"
import { getClient } from "@/lib/actions/clients"
import { ClientForm } from "@/components/clients/client-form"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClientDeleteButton } from "@/components/clients/client-delete-button"

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole(["admin", "manager"])
  const { id } = await params
  const client = await getClient(id)

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground mt-2">
            {client.contact_name ?? "Client"}
            {client.contact_email ? ` - ${client.contact_email}` : ""}
          </p>
        </div>
        <ClientDeleteButton clientId={client.id} clientName={client.name} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClientForm mode="edit" client={client} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Projects ({client.projects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects linked to this client yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {client.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{project.name}</span>
                      <Badge variant="outline" className="capitalize">
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span>{client.default_currency}</span>
                </div>
                {client.tax_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tax ID</span>
                    <span>{client.tax_id}</span>
                  </div>
                )}
                {client.billing_address && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">
                      Billing Address
                    </span>
                    <span className="whitespace-pre-line">
                      {client.billing_address}
                    </span>
                  </div>
                )}
                {client.notes && (
                  <div className="flex flex-col gap-1 pt-2 border-t">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="whitespace-pre-line">{client.notes}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
