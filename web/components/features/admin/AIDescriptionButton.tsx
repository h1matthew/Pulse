'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AIDescriptionButtonProps {
  title: string
  onGenerated: (description: string) => void
}

export function AIDescriptionButton({ title, onGenerated }: AIDescriptionButtonProps) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a module title first')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/admin/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a brief, engaging description (2-3 sentences) for a rocket science educational module titled: "${title}". The description should explain what students will learn and why it's important. Do not use markdown or special formatting.`,
          type: 'description',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate description')
      }

      const data = await response.json()

      // Extract just the text content (API currently returns markdown)
      let description = data.content || ''
      // Remove any markdown formatting
      description = description
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .trim()

      // Take only the first 2-3 sentences if the response is too long
      const sentences = description.match(/[^.!?]+[.!?]+/g) || [description]
      description = sentences.slice(0, 3).join(' ').trim()

      onGenerated(description)
      toast.success('Description generated')
    } catch (error) {
      console.error('Error generating description:', error)
      toast.error('Failed to generate description')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleGenerate}
      disabled={generating || !title.trim()}
      className="h-7 px-2 text-xs"
    >
      {generating ? (
        <>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3 mr-1" />
          Generate
        </>
      )}
    </Button>
  )
}
