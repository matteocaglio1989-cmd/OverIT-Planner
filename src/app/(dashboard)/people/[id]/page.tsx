export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <p className="text-muted-foreground mt-2">View and edit team member profile. {id}</p>
    </div>
  )
}
