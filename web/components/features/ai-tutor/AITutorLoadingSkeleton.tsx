'use client'

import { Brain } from 'lucide-react'

export function AITutorLoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col mx-auto w-full max-w-3xl px-6 py-6">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Tutor</h1>
            <div className="h-4 w-48 bg-muted/30 rounded animate-pulse mt-1" />
          </div>
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-muted/30 mb-4 animate-pulse" />
          <div className="h-4 w-48 bg-muted/30 rounded mb-2 animate-pulse" />
          <div className="h-3 w-64 bg-muted/20 rounded animate-pulse" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="shrink-0 border-t border-border/50 pt-4">
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-muted/30 rounded-lg animate-pulse" />
          <div className="w-12 h-12 bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}

interface SidebarSkeletonProps {
  showNewChatButton?: boolean
}

export function SidebarSkeleton({ showNewChatButton = true }: SidebarSkeletonProps) {
  return (
    <>
      {showNewChatButton && (
        <div className="p-4 border-b border-border/50">
          <div className="h-9 bg-muted/50 rounded-md animate-pulse" />
        </div>
      )}
      <div className="flex-1 p-2 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    </>
  )
}

export function ChatLoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 rounded-full bg-muted/30 mb-4 animate-pulse" />
        <div className="h-4 w-48 bg-muted/30 rounded mb-2 animate-pulse" />
        <div className="h-3 w-64 bg-muted/20 rounded animate-pulse" />
      </div>
    </div>
  )
}
