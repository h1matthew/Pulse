'use client'

import { useState, useCallback } from 'react'
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
import { Plus, ArrowRight, GripVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { DbLesson } from '@/types/admin'

interface LessonsListProps {
  moduleId: string
  initialLessons: DbLesson[]
}

interface SortableLessonItemProps {
  lesson: DbLesson
  index: number
  moduleId: string
}

function SortableLessonItem({ lesson, index, moduleId }: SortableLessonItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors group ${
        isDragging ? 'opacity-80 shadow-lg z-50 bg-card' : 'hover:bg-muted/50'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        onClick={e => e.preventDefault()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Link
        href={`/admin/modules/${moduleId}/lessons/${lesson.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-medium flex-shrink-0">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
              {lesson.title}
            </h4>
            {lesson.is_quiz && (
              <Badge variant="outline" className="text-xs">
                Quiz
              </Badge>
            )}
            <Badge
              variant={lesson.status === 'published' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {lesson.status}
            </Badge>
          </div>
          {lesson.description && (
            <p className="text-sm text-muted-foreground truncate">
              {lesson.description}
            </p>
          )}
        </div>

        <span className="text-xs text-muted-foreground flex-shrink-0">
          {lesson.estimated_minutes} min
        </span>

        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </Link>
    </div>
  )
}

export function LessonsList({ moduleId, initialLessons }: LessonsListProps) {
  const router = useRouter()
  const [lessons, setLessons] = useState(initialLessons)
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
        const oldIndex = lessons.findIndex(l => l.id === active.id)
        const newIndex = lessons.findIndex(l => l.id === over.id)

        const newLessons = arrayMove(lessons, oldIndex, newIndex)
        setLessons(newLessons)

        // Create reorder payload
        const reorderPayload = newLessons.map((l, idx) => ({
          id: l.id,
          order_index: idx,
        }))

        setIsReordering(true)
        try {
          const response = await fetch('/api/admin/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'lessons',
              items: reorderPayload,
            }),
          })

          if (!response.ok) throw new Error('Failed to reorder')

          toast.success('Lessons reordered')
          router.refresh()
        } catch (error) {
          console.error('Failed to reorder lessons:', error)
          toast.error('Failed to reorder lessons')
          // Revert on error
          setLessons(initialLessons)
        } finally {
          setIsReordering(false)
        }
      }
    },
    [lessons, initialLessons, router]
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Lessons
            {isReordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription>
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} in this module. Drag to reorder.
          </CardDescription>
        </div>
        <Link href={`/admin/modules/${moduleId}/lessons/new`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">No lessons yet</p>
            <Link href={`/admin/modules/${moduleId}/lessons/new`}>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Lesson
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
            <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {lessons.map((lesson, index) => (
                  <SortableLessonItem
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    moduleId={moduleId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
