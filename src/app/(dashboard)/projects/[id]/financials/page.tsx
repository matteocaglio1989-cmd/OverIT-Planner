import { notFound } from "next/navigation"
import { getProject } from "@/lib/actions/projects"
import { ProjectFinancialsView } from "@/components/projects/project-financials-view"

export default async function ProjectFinancialsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const project = await getProject(id)
  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-3xl font-bold tracking-tight">
            {project.name} - Financials
          </h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Track project budget, costs, and revenue.
        </p>
      </div>

      <ProjectFinancialsView project={project} />
    </div>
  )
}
