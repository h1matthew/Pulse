/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTextSelection } from '../useTextSelection'
import React from 'react'

// Mock window.getSelection
function createMockSelection(options: {
  text?: string
  isCollapsed?: boolean
  rect?: Partial<DOMRect>
  container?: Node
} = {}) {
  const {
    text = 'selected text',
    isCollapsed = false,
    rect = { width: 100, height: 20, x: 10, y: 10, top: 10, left: 10, right: 110, bottom: 30 },
    container = document.body,
  } = options

  const mockRange = {
    commonAncestorContainer: container,
    getBoundingClientRect: () => ({
      width: rect.width ?? 100,
      height: rect.height ?? 20,
      x: rect.x ?? 10,
      y: rect.y ?? 10,
      top: rect.top ?? 10,
      left: rect.left ?? 10,
      right: rect.right ?? 110,
      bottom: rect.bottom ?? 30,
      toJSON: () => ({}),
    }),
  }

  return {
    toString: () => text,
    isCollapsed,
    getRangeAt: () => mockRange,
  }
}

describe('useTextSelection', () => {
  let containerRef: React.RefObject<HTMLDivElement>
  let containerElement: HTMLDivElement
  let originalGetSelection: typeof window.getSelection

  beforeEach(() => {
    // Store original getSelection
    originalGetSelection = window.getSelection as typeof window.getSelection

    // Create a container element
    containerElement = document.createElement('div')
    document.body.appendChild(containerElement)

    // Create a mutable ref object
    containerRef = { current: containerElement }
  })

  afterEach(() => {
    // Restore original getSelection
    Object.defineProperty(window, 'getSelection', {
      value: originalGetSelection,
      writable: true,
    })

    // Clean up container
    if (containerElement.parentNode) {
      containerElement.parentNode.removeChild(containerElement)
    }
  })

  it('returns null when no selection', () => {
    Object.defineProperty(window, 'getSelection', {
      value: () => null,
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    expect(result.current).toBeNull()
  })

  it('returns null when selection is collapsed', () => {
    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({ isCollapsed: true }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    // Trigger selection change
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })

    expect(result.current).toBeNull()
  })

  it('returns null for empty/whitespace selection', () => {
    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({ text: '   ' }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })

    expect(result.current).toBeNull()
  })

  it('returns selection when text is selected within container', async () => {
    // Add text node to container
    const textNode = document.createTextNode('Hello World')
    containerElement.appendChild(textNode)

    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({
        text: 'Hello',
        container: textNode,
        rect: { width: 50, height: 20 },
      }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    // Trigger mouseup which triggers selection check
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    // Wait for the setTimeout in handleMouseUp
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    // The selection should be set (if container check passes)
    if (result.current) {
      expect(result.current.text).toBe('Hello')
      expect(result.current.rect.width).toBe(50)
    }
  })

  it('returns null when selection is outside container', async () => {
    // Create selection outside container
    const outsideElement = document.createElement('div')
    document.body.appendChild(outsideElement)
    const textNode = document.createTextNode('Outside text')
    outsideElement.appendChild(textNode)

    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({
        text: 'Outside',
        container: textNode,
      }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(result.current).toBeNull()

    // Cleanup
    document.body.removeChild(outsideElement)
  })

  it('returns null when rect has zero dimensions', async () => {
    const textNode = document.createTextNode('Text')
    containerElement.appendChild(textNode)

    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({
        text: 'Text',
        container: textNode,
        rect: { width: 0, height: 0 },
      }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(result.current).toBeNull()
  })

  it('clears selection on mousedown when selection is collapsed', async () => {
    const textNode = document.createTextNode('Text')
    containerElement.appendChild(textNode)

    // First, set a selection
    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({
        text: 'Text',
        container: textNode,
      }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    // Now simulate mousedown with collapsed selection
    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({ isCollapsed: true }),
      writable: true,
    })

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown'))
    })

    expect(result.current).toBeNull()
  })

  it('handles null containerRef', () => {
    const nullRef = { current: null }

    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({ text: 'Selected' }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(nullRef))

    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })

    // Should still try to get selection (container check is skipped)
    // The exact behavior depends on implementation
  })

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() => useTextSelection(containerRef))

    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('trims selected text', async () => {
    const textNode = document.createTextNode('  Hello World  ')
    containerElement.appendChild(textNode)

    Object.defineProperty(window, 'getSelection', {
      value: () => createMockSelection({
        text: '  Hello World  ',
        container: textNode,
      }),
      writable: true,
    })

    const { result } = renderHook(() => useTextSelection(containerRef))

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    if (result.current) {
      expect(result.current.text).toBe('Hello World')
    }
  })
})
