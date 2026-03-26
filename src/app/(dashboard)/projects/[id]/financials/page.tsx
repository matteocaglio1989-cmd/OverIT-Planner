export default async function ProjectFinancialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Project Financials</h1>
      <p className="text-muted-foreground mt-2">Track project budget, costs, and revenue. {id}</p>
    </div>
  )
}
