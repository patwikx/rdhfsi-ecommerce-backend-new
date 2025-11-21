import { Skeleton } from '@/components/ui/skeleton'

export default function ShelfDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* QR Code Card */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-24 h-24 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-24 rounded" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          </div>
        </div>

        {/* Other Stats */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        {/* Left Side - Shelf Details */}
        <div className="space-y-4">
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Tabs */}
        <div>
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-10 w-40 rounded" />
            <Skeleton className="h-10 w-40 rounded" />
          </div>

          <div className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>

            {/* Table Skeleton */}
            <div className="space-y-3">
              <div className="grid grid-cols-8 gap-4 pb-2 border-b">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-8 gap-4 py-3">
                  {[...Array(8)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
