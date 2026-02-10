'use client'

import { type Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Undo,
  Redo,
  Calculator,
  Video,
  AlertCircle,
  ImageIcon,
  BookOpen,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30 flex-wrap">
      {/* Text formatting */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-active={editor.isActive('bold')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-active={editor.isActive('italic')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        data-active={editor.isActive('strike')}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        data-active={editor.isActive('heading', { level: 2 })}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        data-active={editor.isActive('heading', { level: 3 })}
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        data-active={editor.isActive('bulletList')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-active={editor.isActive('orderedList')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Insert blocks dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
            Insert Block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => editor.chain().focus().setEquationBlock().run()}>
            <Calculator className="h-4 w-4 mr-2" />
            Equation
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setVideoBlock().run()}>
            <Video className="h-4 w-4 mr-2" />
            Video
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setCalloutBlock().run()}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Callout
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setImageBlock().run()}>
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setWorkedExampleBlock().run()}>
            <BookOpen className="h-4 w-4 mr-2" />
            Worked Example
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setPracticeProblemBlock().run()}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Practice Problem
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}
