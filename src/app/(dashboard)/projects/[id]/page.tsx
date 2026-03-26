export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Project Details</h1>
      <p className="text-muted-foreground mt-2">View and manage project details, team, and phases. {id}</p>
    </div>
  )
}
