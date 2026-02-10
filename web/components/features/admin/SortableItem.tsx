'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface SortableItemProps {
  id: string
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function SortableItem({ id, children, className, disabled = false }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'z-50 opacity-80 shadow-lg',
        className
      )}
    >
      {children}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

// Simplified drag handle component to be used inside existing card designs
export function DragHandle({ id, disabled = false }: { id: string; disabled?: boolean }) {
  const { attributes, listeners, isDragging } = useSortable({ id, disabled })

  if (disabled) return null

  return (
    <div
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors',
        isDragging && 'cursor-grabbing'
      )}
      title="Drag to reorder"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}
