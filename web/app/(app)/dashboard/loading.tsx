// Loading state for dashboard page

import { Card } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      {/* Welcome skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted/50 rounded animate-pulse" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 bg-muted/50 rounded-lg animate-pulse" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-8 w-24 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
            </div>
          </Card>
        ))}
      </div>

      {/* Module progress skeleton */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted/50 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-6 w-32 bg-muted/50 rounded animate-pulse mb-4" />
              <div className="h-8 w-20 bg-muted/50 rounded animate-pulse mb-2" />
              <div className="h-2 w-full bg-muted/50 rounded animate-pulse mb-4" />
              <div className="h-10 w-full bg-muted/50 rounded animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
