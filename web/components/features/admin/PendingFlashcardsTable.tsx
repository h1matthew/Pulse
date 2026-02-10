'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pencil, Search, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { EditFlashcardDialog } from './EditFlashcardDialog'
import { SimilarCardsPanel } from './SimilarCardsPanel'
import { RejectFlashcardDialog } from './RejectFlashcardDialog'
import type { CommunityFlashcard } from '@/types/flashcards'

interface PendingFlashcardsTableProps {
  status: 'pending' | 'approved' | 'rejected'
}

export function PendingFlashcardsTable({ status }: PendingFlashcardsTableProps) {
  const [cards, setCards] = useState<CommunityFlashcard[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<CommunityFlashcard | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [similarPanelOpen, setSimilarPanelOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchCards = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status,
        offset: offset.toString(),
        limit: limit.toString(),
      })

      const response = await fetch(`/api/admin/flashcards?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCards(data.cards)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [status, offset])

  const approvingRef = useRef<Set<string>>(new Set())

  const handleApprove = async (cardId: string) => {
    if (approvingRef.current.has(cardId)) return
    approvingRef.current.add(cardId)
    setActionLoading(cardId)
    try {
      const response = await fetch(`/api/admin/flashcards/${cardId}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh the list
        fetchCards()
      }
    } catch (error) {
      console.error('Error approving flashcard:', error)
    } finally {
      setActionLoading(null)
      approvingRef.current.delete(cardId)
    }
  }

  const handleEdit = (card: CommunityFlashcard) => {
    setSelectedCard(card)
    setEditDialogOpen(true)
  }

  const handleViewSimilar = (card: CommunityFlashcard) => {
    setSelectedCard(card)
    setSimilarPanelOpen(true)
  }

  const handleReject = (card: CommunityFlashcard) => {
    setSelectedCard(card)
    setRejectDialogOpen(true)
  }

  const handleEditComplete = () => {
    setEditDialogOpen(false)
    setSelectedCard(null)
    fetchCards()
  }

  const handleRejectComplete = () => {
    setRejectDialogOpen(false)
    setSelectedCard(null)
    fetchCards()
  }

  const difficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Loading flashcards...</p>
        </CardContent>
      </Card>
    )
  }

  if (cards.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            No {status} flashcards found.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {status.charAt(0).toUpperCase() + status.slice(1)} Flashcards ({total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cards list */}
          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {card.module_id}
                      </Badge>
                      <Badge className={`text-xs ${difficultyColor(card.difficulty)}`}>
                        {card.difficulty}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{card.front}</p>
                      <p className="text-sm text-muted-foreground mt-1">{card.back}</p>
                      {card.hint && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Hint: {card.hint}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(card.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(card)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewSimilar(card)}
                      title="View similar"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    {status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(card.id)}
                          disabled={actionLoading === card.id}
                          title="Approve"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(card)}
                          disabled={actionLoading === card.id}
                          title="Reject"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedCard && (
        <>
          <EditFlashcardDialog
            card={selectedCard}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onComplete={handleEditComplete}
          />
          <SimilarCardsPanel
            card={selectedCard}
            open={similarPanelOpen}
            onOpenChange={setSimilarPanelOpen}
          />
          <RejectFlashcardDialog
            card={selectedCard}
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            onComplete={handleRejectComplete}
          />
        </>
      )}
    </>
  )
}
