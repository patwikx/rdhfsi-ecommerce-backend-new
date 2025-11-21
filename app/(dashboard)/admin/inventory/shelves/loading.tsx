import { Skeleton } from '@/components/ui/skeleton'

export default function ShelvesLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-16 mb-1" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Skeleton className="flex-1 min-w-[200px] h-10" />
        <Skeleton className="w-[200px] h-10" />
        <Skeleton className="w-[180px] h-10" />
      </div>

      {/* Stats text */}
      <Skeleton className="h-4 w-40" />

      {/* Table */}
      <div className="rounded-md border">
        <div className="p-4">
          {/* Table Header */}
          <div className="grid grid-cols-9 gap-4 mb-4 pb-2 border-b">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>

          {/* Table Rows */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="grid grid-cols-9 gap-4 py-3 border-b last:border-0">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-6" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
