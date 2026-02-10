'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useDebouncedCallback } from '@/hooks/useDebounce'
import { createClient } from '@/lib/supabase/client'
import {
  contentBlocksToEditor,
  editorToContentBlocks,
} from '@/lib/admin/editor-serialization'
import {
  VideoNode,
  EquationNode,
  CalloutNode,
  ImageNode,
  WorkedExampleNode,
  PracticeProblemNode,
} from './extensions'
import { EditorToolbar } from './EditorToolbar'
import { SlashCommandMenu } from './SlashCommandMenu'
import { AIGenerateButton } from './AIGenerateButton'
import type { DbContentBlock } from '@/types/admin'

interface LessonRichTextEditorProps {
  lessonId: string
  initialBlocks: DbContentBlock[]
  lessonTitle?: string
  moduleTitle?: string
  onSave?: () => void
}

export function LessonRichTextEditor({
  lessonId,
  initialBlocks,
  lessonTitle,
  moduleTitle,
  onSave,
}: LessonRichTextEditorProps) {
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const editorRef = useRef<HTMLDivElement>(null)

  const initialContent = contentBlocksToEditor(initialBlocks)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing or type "/" for commands...',
      }),
      VideoNode,
      EquationNode,
      CalloutNode,
      ImageNode,
      WorkedExampleNode,
      PracticeProblemNode,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      setHasChanges(true)
      debouncedSave()

      // Check for slash command
      const { from } = editor.state.selection
      const text = editor.state.doc.textBetween(Math.max(0, from - 1), from)

      if (text === '/') {
        // Get cursor position
        const coords = editor.view.coordsAtPos(from)
        setSlashMenuPosition({
          top: coords.bottom + 8,
          left: coords.left,
        })
        setSlashMenuOpen(true)
      } else if (slashMenuOpen) {
        // Check if we're still in a slash command context
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from)
        if (!textBefore.includes('/')) {
          setSlashMenuOpen(false)
        }
      }
    },
  })

  const saveContent = useCallback(async () => {
    if (!editor) return

    setSaving(true)
    try {
      const supabase = createClient()
      const doc = editor.getJSON()
      const newBlocks = editorToContentBlocks(doc, lessonId, initialBlocks)

      // Delete existing blocks
      const { error: deleteError } = await supabase
        .from('content_blocks')
        .delete()
        .eq('lesson_id', lessonId)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw new Error(deleteError.message || 'Failed to delete existing blocks')
      }

      // Insert new blocks
      if (newBlocks.length > 0) {
        const { error: insertError } = await supabase
          .from('content_blocks')
          .insert(newBlocks)

        if (insertError) {
          console.error('Insert error:', insertError)
          throw new Error(insertError.message || 'Failed to insert new blocks')
        }
      }

      setHasChanges(false)
      onSave?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save content'
      console.error('Error saving content:', message, error)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [editor, lessonId, initialBlocks, onSave])

  const debouncedSave = useDebouncedCallback(saveContent, 2000)

  const handleManualSave = useCallback(async () => {
    await saveContent()
    toast.success('Content saved')
  }, [saveContent])

  // Cleanup debounced callback on unmount
  useEffect(() => {
    return () => {
      // Save any pending changes on unmount
      if (hasChanges) {
        saveContent()
      }
    }
  }, [hasChanges, saveContent])

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <EditorToolbar editor={editor} />

      <div ref={editorRef} className="relative">
        <EditorContent editor={editor} />

        {editor && (
          <SlashCommandMenu
            editor={editor}
            isOpen={slashMenuOpen}
            onClose={() => setSlashMenuOpen(false)}
            position={slashMenuPosition}
          />
        )}
      </div>

      <div className="flex items-center justify-between p-3 border-t bg-muted/30">
        <div className="flex items-center gap-3">
          <AIGenerateButton
            editor={editor}
            lessonTitle={lessonTitle}
            moduleTitle={moduleTitle}
          />
          {hasChanges && (
            <span className="text-xs text-muted-foreground">
              {saving ? 'Saving...' : 'Unsaved changes'}
            </span>
          )}
        </div>
        <Button
          onClick={handleManualSave}
          disabled={saving || !hasChanges}
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
