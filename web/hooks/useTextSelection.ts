'use client'

import { useState, useEffect, useRef, RefObject } from 'react'

export interface TextSelection {
  text: string
  rect: DOMRect
}

export function useTextSelection(
  containerRef: RefObject<HTMLElement | null>
): TextSelection | null {
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const handleSelectionChange = () => {
      if (!mountedRef.current) return

      const sel = window.getSelection()

      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null)
        return
      }

      const text = sel.toString().trim()

      // Check if selection is within our container
      const container = containerRef.current
      if (container) {
        const range = sel.getRangeAt(0)
        const selectionContainer = range.commonAncestorContainer

        const isWithinContainer = container.contains(
          selectionContainer.nodeType === Node.TEXT_NODE
            ? selectionContainer.parentElement
            : selectionContainer
        )

        if (!isWithinContainer) {
          setSelection(null)
          return
        }
      }

      // Get the bounding rect of the selection
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (text && rect.width > 0 && rect.height > 0) {
        setSelection({ text, rect })
      }
    }

    const handleMouseUp = () => {
      setTimeout(() => {
        if (mountedRef.current) {
          handleSelectionChange()
        }
      }, 10)
    }

    const handleClickOutside = () => {
      if (!mountedRef.current) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) {
        setSelection(null)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      mountedRef.current = false
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [containerRef])

  return selection
}
