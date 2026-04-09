import { Skeleton } from "@/components/ui/skeleton"

export default function BusinessLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero image */}
      <Skeleton className="h-56 w-full rounded-xl mb-6" />

      {/* Business name + meta */}
      <Skeleton className="h-8 w-72 mb-2" />
      <Skeleton className="h-4 w-48 mb-1" />
      <Skeleton className="h-4 w-36 mb-6" />

      {/* Action buttons */}
      <div className="flex gap-3 mb-8">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Tabs content */}
      <Skeleton className="h-10 w-72 rounded-lg mb-4" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
