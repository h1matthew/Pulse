'use client'

import { useState } from 'react'
import { type Editor } from '@tiptap/react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { generatedBlocksToEditor } from '@/lib/admin/editor-serialization'

interface AIGenerateButtonProps {
  editor: Editor | null
  lessonTitle?: string
  moduleTitle?: string
}

export function AIGenerateButton({ editor, lessonTitle, moduleTitle }: AIGenerateButtonProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!editor || !prompt.trim()) return

    setGenerating(true)
    try {
      const context = [
        lessonTitle && `Lesson: ${lessonTitle}`,
        moduleTitle && `Module: ${moduleTitle}`,
      ]
        .filter(Boolean)
        .join(', ')

      const fullPrompt = context
        ? `${prompt}\n\nContext: ${context}`
        : prompt

      const response = await fetch('/api/admin/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          type: 'lesson',
          returnStructured: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()

      if (data.blocks && Array.isArray(data.blocks)) {
        // Insert structured blocks
        const editorContent = generatedBlocksToEditor(data.blocks)
        editor.commands.insertContent(editorContent.content || [])
      } else if (data.content) {
        // Fallback: insert as paragraph
        editor.commands.insertContent({
          type: 'paragraph',
          content: [{ type: 'text', text: data.content }],
        })
      }

      toast.success('Content generated and inserted')
      setOpen(false)
      setPrompt('')
    } catch (error) {
      console.error('Error generating content:', error)
      toast.error('Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Lesson Content</DialogTitle>
          <DialogDescription>
            Describe what content you want to generate. The AI will create structured lesson
            content including text, equations, and placeholders for videos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">What should this section cover?</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Explain Newton's Third Law with examples of action-reaction pairs in rocketry. Include the mathematical relationship and a practical example calculation."
              rows={5}
            />
          </div>
          {(lessonTitle || moduleTitle) && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <strong>Context:</strong>{' '}
              {[lessonTitle && `Lesson: ${lessonTitle}`, moduleTitle && `Module: ${moduleTitle}`]
                .filter(Boolean)
                .join(' | ')}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
