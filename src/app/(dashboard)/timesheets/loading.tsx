import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-6 w-full" />
          ))}
          {Array.from({ length: 40 }).map((_, i) => (
            <Skeleton key={`cell-${i}`} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
