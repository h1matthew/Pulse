/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { SortableList } from '../SortableList'

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
}))

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr, from, to) => {
    const newArr = [...arr]
    const [item] = newArr.splice(from, 1)
    newArr.splice(to, 0, item)
    return newArr
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
}))

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToVerticalAxis: vi.fn(),
  restrictToParentElement: vi.fn(),
}))

interface TestItem {
  id: string
  order_index: number
  name: string
}

const mockItems: TestItem[] = [
  { id: '1', order_index: 0, name: 'Item 1' },
  { id: '2', order_index: 1, name: 'Item 2' },
  { id: '3', order_index: 2, name: 'Item 3' },
]

describe('SortableList', () => {
  const mockOnReorder = vi.fn()
  const renderItem = (item: TestItem) => (
    <div key={item.id} data-testid={`item-${item.id}`}>
      {item.name}
    </div>
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all items', () => {
    render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
      />
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('renders items using renderItem function', () => {
    render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={(item) => (
          <div key={item.id} data-testid={`custom-${item.id}`}>
            Custom: {item.name}
          </div>
        )}
      />
    )

    expect(screen.getByText('Custom: Item 1')).toBeInTheDocument()
    expect(screen.getByTestId('custom-1')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
        className="custom-list-class"
      />
    )

    // Look for the wrapper div with the custom class
    expect(container.querySelector('.custom-list-class')).toBeInTheDocument()
  })

  it('renders with DndContext when not disabled', () => {
    render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
        disabled={false}
      />
    )

    expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
    expect(screen.getByTestId('sortable-context')).toBeInTheDocument()
  })

  it('renders without DndContext when disabled', () => {
    render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
        disabled={true}
      />
    )

    expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sortable-context')).not.toBeInTheDocument()

    // Items should still be rendered
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('uses custom keyExtractor', () => {
    const customKeyExtractor = (item: TestItem) => `custom-${item.id}`

    render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
        keyExtractor={customKeyExtractor}
      />
    )

    // Should render without errors using custom key
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('renders drag overlay when provided', () => {
    render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
        renderDragOverlay={(item) => <div>Dragging: {item.name}</div>}
      />
    )

    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument()
  })

  it('passes correct index to renderItem', () => {
    const renderWithIndex = (item: TestItem, index: number) => (
      <div key={item.id} data-testid={`item-${item.id}`}>
        {item.name} at index {index}
      </div>
    )

    render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderWithIndex}
      />
    )

    expect(screen.getByText('Item 1 at index 0')).toBeInTheDocument()
    expect(screen.getByText('Item 2 at index 1')).toBeInTheDocument()
    expect(screen.getByText('Item 3 at index 2')).toBeInTheDocument()
  })

  it('handles empty items array', () => {
    const { container } = render(
      <SortableList
        items={[]}
        onReorder={mockOnReorder}
        renderItem={renderItem}
      />
    )

    // Should render empty container without errors
    expect(container).toBeInTheDocument()
    expect(screen.queryByTestId('item-1')).not.toBeInTheDocument()
  })

  it('updates local items when props change', () => {
    const { rerender } = render(
      <SortableList
        items={mockItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
      />
    )

    const newItems = [
      { id: '4', order_index: 0, name: 'Item 4' },
      { id: '5', order_index: 1, name: 'Item 5' },
    ]

    rerender(
      <SortableList
        items={newItems}
        onReorder={mockOnReorder}
        renderItem={renderItem}
      />
    )

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument()
    expect(screen.getByText('Item 4')).toBeInTheDocument()
    expect(screen.getByText('Item 5')).toBeInTheDocument()
  })
})
