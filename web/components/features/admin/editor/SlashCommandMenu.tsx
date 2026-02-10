'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { type Editor } from '@tiptap/react'
import {
  Heading1,
  Heading2,
  Type,
  Calculator,
  Video,
  AlertCircle,
  List,
  ImageIcon,
  BookOpen,
  HelpCircle,
} from 'lucide-react'

interface SlashCommandMenuProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  position: { top: number; left: number }
}

interface CommandItem {
  title: string
  description: string
  icon: typeof Heading1
  command: (editor: Editor) => void
}

const commands: CommandItem[] = [
  {
    title: 'Heading',
    description: 'Large section heading',
    icon: Heading1,
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
  },
  {
    title: 'Subheading',
    description: 'Smaller section heading',
    icon: Heading2,
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
  },
  {
    title: 'Text',
    description: 'Plain text paragraph',
    icon: Type,
    command: (editor) => {
      editor.chain().focus().setParagraph().run()
    },
  },
  {
    title: 'Equation',
    description: 'LaTeX math equation',
    icon: Calculator,
    command: (editor) => {
      editor.chain().focus().setEquationBlock().run()
    },
  },
  {
    title: 'Video',
    description: 'Animated video composition',
    icon: Video,
    command: (editor) => {
      editor.chain().focus().setVideoBlock().run()
    },
  },
  {
    title: 'Callout',
    description: 'Highlighted info box',
    icon: AlertCircle,
    command: (editor) => {
      editor.chain().focus().setCalloutBlock().run()
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: List,
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    title: 'Image',
    description: 'Image with caption',
    icon: ImageIcon,
    command: (editor) => {
      editor.chain().focus().setImageBlock().run()
    },
  },
  {
    title: 'Worked Example',
    description: 'Step-by-step solution',
    icon: BookOpen,
    command: (editor) => {
      editor.chain().focus().setWorkedExampleBlock().run()
    },
  },
  {
    title: 'Practice Problem',
    description: 'Interactive exercise',
    icon: HelpCircle,
    command: (editor) => {
      editor.chain().focus().setPracticeProblemBlock().run()
    },
  },
]

export function SlashCommandMenu({ editor, isOpen, onClose, position }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [search, setSearch] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  const selectItem = useCallback(
    (index: number) => {
      const item = filteredCommands[index]
      if (item) {
        // Delete the slash and search text
        const { from } = editor.state.selection
        const text = editor.state.doc.textBetween(Math.max(0, from - 20), from)
        const slashIndex = text.lastIndexOf('/')
        if (slashIndex !== -1) {
          const deleteFrom = from - (text.length - slashIndex)
          editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run()
        }

        item.command(editor)
        onClose()
      }
    },
    [editor, filteredCommands, onClose]
  )

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSelectedIndex(0)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        selectItem(selectedIndex)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Backspace' && search === '') {
        onClose()
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setSearch((prev) => prev + e.key)
        setSelectedIndex(0)
      } else if (e.key === 'Backspace') {
        setSearch((prev) => prev.slice(0, -1))
        setSelectedIndex(0)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands.length, selectItem, onClose, search])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 bg-popover border rounded-lg shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {search && (
        <div className="px-3 py-2 border-b text-xs text-muted-foreground">
          Searching: <span className="font-mono">{search}</span>
        </div>
      )}
      <div className="max-h-80 overflow-y-auto py-1">
        {filteredCommands.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No commands found
          </div>
        ) : (
          filteredCommands.map((cmd, index) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.title}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{cmd.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
