'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { CommunityFlashcard } from '@/types/flashcards'

interface EditFlashcardDialogProps {
  card: CommunityFlashcard
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function EditFlashcardDialog({
  card,
  open,
  onOpenChange,
  onComplete,
}: EditFlashcardDialogProps) {
  const [front, setFront] = useState(card.front)
  const [back, setBack] = useState(card.back)
  const [hint, setHint] = useState(card.hint || '')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(card.difficulty)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/flashcards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front,
          back,
          hint: hint || null,
          difficulty,
        }),
      })

      if (response.ok) {
        onComplete()
      }
    } catch (error) {
      console.error('Error updating flashcard:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Flashcard</DialogTitle>
          <DialogDescription>
            Make changes to the flashcard before approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Front */}
          <div className="space-y-2">
            <Label htmlFor="front">Question</Label>
            <Textarea
              id="front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              placeholder="Enter question..."
            />
          </div>

          {/* Back */}
          <div className="space-y-2">
            <Label htmlFor="back">Answer</Label>
            <Textarea
              id="back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              placeholder="Enter answer..."
            />
          </div>

          {/* Hint */}
          <div className="space-y-2">
            <Label htmlFor="hint">Hint (optional)</Label>
            <Textarea
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              rows={2}
              placeholder="Enter hint..."
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as 'easy' | 'medium' | 'hard')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easy" id="edit-easy" />
                <Label htmlFor="edit-easy" className="cursor-pointer">Easy</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="edit-medium" />
                <Label htmlFor="edit-medium" className="cursor-pointer">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="edit-hard" />
                <Label htmlFor="edit-hard" className="cursor-pointer">Hard</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !front || !back}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
