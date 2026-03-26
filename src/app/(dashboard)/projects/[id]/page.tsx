import { notFound } from "next/navigation"
import { getProject } from "@/lib/actions/projects"
import { getClients } from "@/lib/actions/clients"
import { getProfiles } from "@/lib/actions/people"
import { getRoleDefinitions } from "@/lib/actions/role-definitions"
import { ProjectDetailTabs } from "@/components/projects/project-detail-tabs"

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [project, clients, profiles, roleDefinitions] = await Promise.all([
    getProject(id),
    getClients(),
    getProfiles(),
    getRoleDefinitions(),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        </div>
        {project.description && (
          <p className="text-muted-foreground mt-2">{project.description}</p>
        )}
      </div>

      <ProjectDetailTabs
        project={project}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        profiles={profiles.map((p) => ({ id: p.id, full_name: p.full_name }))}
        roleDefinitions={roleDefinitions}
      />
    </div>
  )
}
