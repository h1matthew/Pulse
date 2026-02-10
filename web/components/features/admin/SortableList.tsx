'use client'

import { useState, useCallback, type ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'

interface SortableItem {
  id: string
  order_index: number
}

interface SortableListProps<T extends SortableItem> {
  items: T[]
  onReorder: (items: { id: string; order_index: number }[]) => Promise<void>
  renderItem: (item: T, index: number) => ReactNode
  renderDragOverlay?: (item: T) => ReactNode
  keyExtractor?: (item: T) => string
  className?: string
  disabled?: boolean
}

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  renderDragOverlay,
  keyExtractor = (item) => item.id,
  className,
  disabled = false,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localItems, setLocalItems] = useState(items)
  const [isReordering, setIsReordering] = useState(false)

  // Update local items when props change
  if (items !== localItems && !isReordering) {
    setLocalItems(items)
  }

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    setIsReordering(true)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)

      if (over && active.id !== over.id) {
        const oldIndex = localItems.findIndex(item => keyExtractor(item) === active.id)
        const newIndex = localItems.findIndex(item => keyExtractor(item) === over.id)

        const newItems = arrayMove(localItems, oldIndex, newIndex)
        setLocalItems(newItems)

        // Create reorder payload with new order_index values
        const reorderPayload = newItems.map((item, index) => ({
          id: keyExtractor(item),
          order_index: index,
        }))

        try {
          await onReorder(reorderPayload)
        } catch (error) {
          console.error('Failed to reorder:', error)
          // Revert on error
          setLocalItems(items)
        }
      }

      setIsReordering(false)
    },
    [items, localItems, keyExtractor, onReorder]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setLocalItems(items)
    setIsReordering(false)
  }, [items])

  const activeItem = activeId ? localItems.find(item => keyExtractor(item) === activeId) : null

  if (disabled) {
    return (
      <div className={className}>
        {localItems.map((item, index) => renderItem(item, index))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext
        items={localItems.map(keyExtractor)}
        strategy={verticalListSortingStrategy}
      >
        <div className={className}>
          {localItems.map((item, index) => renderItem(item, index))}
        </div>
      </SortableContext>

      {renderDragOverlay && (
        <DragOverlay>
          {activeItem ? renderDragOverlay(activeItem) : null}
        </DragOverlay>
      )}
    </DndContext>
  )
}
