'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { CommunityFlashcard } from '@/types/flashcards'

interface SimilarCardsPanelProps {
  card: CommunityFlashcard
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SimilarCard {
  id: string
  front: string
  back: string
  status: string
  similarity: number
}

export function SimilarCardsPanel({ card, open, onOpenChange }: SimilarCardsPanelProps) {
  const [similarCards, setSimilarCards] = useState<SimilarCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchSimilarCards()
    }
  }, [open, card.id])

  const fetchSimilarCards = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/flashcards/${card.id}/similar`)
      if (response.ok) {
        const data = await response.json()
        setSimilarCards(data.similarCards || [])
      }
    } catch (error) {
      console.error('Error fetching similar cards:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Similar Flashcards</DialogTitle>
          <DialogDescription>
            Check for potential duplicates before approving
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current card */}
          <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-2">Current Card</p>
            <p className="text-sm font-medium mb-1">{card.front}</p>
            <p className="text-sm text-muted-foreground">{card.back}</p>
          </div>

          {/* Similar cards */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : similarCards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No similar cards found
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">Found {similarCards.length} similar card(s):</p>
              {similarCards.map((similar) => (
                <div
                  key={similar.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(similar.similarity * 100)}% similar
                    </Badge>
                    <Badge
                      variant={
                        similar.status === 'approved'
                          ? 'default'
                          : similar.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {similar.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{similar.front}</p>
                  <p className="text-sm text-muted-foreground">{similar.back}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
