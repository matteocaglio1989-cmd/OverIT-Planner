export default async function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Client Details</h1>
      <p className="text-muted-foreground mt-2">View client details and linked projects. {id}</p>
    </div>
  )
}
