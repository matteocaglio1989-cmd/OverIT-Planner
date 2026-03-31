import { requireRole } from "@/lib/auth-guard"
import { getProjects } from "@/lib/actions/projects"
import { getClients } from "@/lib/actions/clients"
import { getProfiles } from "@/lib/actions/people"
import { ProjectsTable } from "@/components/projects/projects-table"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"

export default async function ProjectsPage() {
  await requireRole(["admin", "manager"])
  const [projects, clients, profiles] = await Promise.all([
    getProjects(),
    getClients(),
    getProfiles(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your projects and track their progress.
          </p>
        </div>
        <NewProjectDialog
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          profiles={profiles.map((p) => ({ id: p.id, full_name: p.full_name }))}
        />
      </div>

      <ProjectsTable projects={projects} />
    </div>
  )
}
