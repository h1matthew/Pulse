'use client'

import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onApproveSelected: () => void
  onRejectSelected: () => void
  totalCount: number
  loading: boolean
  allSelected: boolean
}

export function BulkActionBar({
  selectedCount,
  onSelectAll,
  onClearSelection,
  onApproveSelected,
  onRejectSelected,
  totalCount,
  loading,
  allSelected,
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{selectedCount} selected</span>
        {!allSelected && totalCount > selectedCount && (
          <Button
            variant="link"
            size="sm"
            className="text-xs h-auto p-0"
            onClick={onSelectAll}
          >
            Select all {totalCount}
          </Button>
        )}
        <Button
          variant="link"
          size="sm"
          className="text-xs h-auto p-0 text-muted-foreground"
          onClick={onClearSelection}
        >
          Clear
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onApproveSelected}
          disabled={loading}
          className="gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Approve all
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRejectSelected}
          disabled={loading}
          className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          Reject all
        </Button>
      </div>
    </div>
  )
}
