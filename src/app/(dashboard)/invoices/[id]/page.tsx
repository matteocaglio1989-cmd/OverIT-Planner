export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Invoice Details</h1>
      <p className="text-muted-foreground mt-2">View and edit invoice details. {id}</p>
    </div>
  )
}
