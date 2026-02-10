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
import type { CommunityFlashcard } from '@/types/flashcards'

interface RejectFlashcardDialogProps {
  card: CommunityFlashcard
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function RejectFlashcardDialog({
  card,
  open,
  onOpenChange,
  onComplete,
}: RejectFlashcardDialogProps) {
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const handleReject = async () => {
    setRejecting(true)
    try {
      const response = await fetch(`/api/admin/flashcards/${card.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || null }),
      })

      if (response.ok) {
        onComplete()
      }
    } catch (error) {
      console.error('Error rejecting flashcard:', error)
    } finally {
      setRejecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Flashcard</DialogTitle>
          <DialogDescription>
            Provide an optional reason for rejecting this flashcard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Show card being rejected */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-sm font-medium mb-1">{card.front}</p>
            <p className="text-sm text-muted-foreground">{card.back}</p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g., Duplicate, incorrect information, poor quality..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
            {rejecting ? 'Rejecting...' : 'Reject Flashcard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
