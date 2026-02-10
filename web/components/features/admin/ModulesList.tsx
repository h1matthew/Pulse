'use client'

import { useState, useCallback, memo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { BookOpen, Plus, ArrowRight, GripVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { DbModule } from '@/types/admin'

interface ModulesListProps {
  initialModules: DbModule[]
}

interface SortableModuleItemProps {
  module: DbModule
  index: number
}

// Memoized to prevent re-renders when siblings change during drag operations
const SortableModuleItem = memo(function SortableModuleItem({ module, index }: SortableModuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-4 p-4 rounded-lg border bg-card transition-colors group cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-80 shadow-lg z-50' : 'hover:bg-muted/50'
      }`}
    >
      <div className="text-muted-foreground p-1">
        <GripVertical className="h-5 w-5" />
      </div>

      <Link
        href={`/admin/modules/${module.id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl flex-shrink-0">
          {module.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Module {index + 1}
            </span>
            <Badge
              variant={module.status === 'published' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {module.status}
            </Badge>
          </div>
          <h3 className="font-medium truncate group-hover:text-primary transition-colors">
            {module.title}
          </h3>
          {module.description && (
            <p className="text-sm text-muted-foreground truncate">
              {module.description}
            </p>
          )}
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </Link>
    </div>
  )
})

export function ModulesList({ initialModules }: ModulesListProps) {
  const router = useRouter()
  const [modules, setModules] = useState(initialModules)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = modules.findIndex(m => m.id === active.id)
        const newIndex = modules.findIndex(m => m.id === over.id)

        const newModules = arrayMove(modules, oldIndex, newIndex)
        setModules(newModules)

        // Create reorder payload
        const reorderPayload = newModules.map((m, idx) => ({
          id: m.id,
          order_index: idx,
        }))

        setIsReordering(true)
        try {
          const response = await fetch('/api/admin/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'modules',
              items: reorderPayload,
            }),
          })

          if (!response.ok) throw new Error('Failed to reorder')

          toast.success('Modules reordered')
          router.refresh()
        } catch (error) {
          console.error('Failed to reorder modules:', error)
          toast.error('Failed to reorder modules')
          // Revert on error
          setModules(initialModules)
        } finally {
          setIsReordering(false)
        }
      }
    },
    [modules, initialModules, router]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Modules</h1>
          <p className="text-sm text-muted-foreground">
            Manage your course modules and their lessons. Drag to reorder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isReordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Link href="/admin/modules/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Module
            </Button>
          </Link>
        </div>
      </div>

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No modules yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first module to start building your course
          </p>
          <Link href="/admin/modules/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          </Link>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {modules.map((module, index) => (
                <SortableModuleItem key={module.id} module={module} index={index} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
