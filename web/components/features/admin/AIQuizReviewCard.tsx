'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, X, ChevronDown, ChevronUp, Pencil, Sparkles } from 'lucide-react'
import { InlineLatex } from '@/components/features/lesson/InlineLatex'

interface AIQuizQuestion {
  questionText: string
  options: string[]
  correctAnswer: string
  explanation: string
}

interface AIGeneratedQuiz {
  id: string
  module_id: string
  lesson_id?: string
  questions: AIQuizQuestion[]
  status: 'pending' | 'approved' | 'rejected'
  generated_at: string
  reviewed_at?: string
  rejection_reason?: string
}

interface AIQuizReviewCardProps {
  quiz: AIGeneratedQuiz
  selected: boolean
  onSelect: (id: string, selected: boolean) => void
  onApprove: (id: string) => void
  onReject: (id: string, reason?: string) => void
  onEdit?: (quiz: AIGeneratedQuiz) => void
  loading?: boolean
}

export function AIQuizReviewCard({
  quiz,
  selected,
  onSelect,
  onApprove,
  onReject,
  onEdit,
  loading,
}: AIQuizReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const handleReject = () => {
    if (showRejectInput) {
      onReject(quiz.id, rejectReason || undefined)
      setShowRejectInput(false)
      setRejectReason('')
    } else {
      setShowRejectInput(true)
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <Card className={`transition-all ${selected ? 'ring-2 ring-primary/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {quiz.status === 'pending' && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelect(quiz.id, !!checked)}
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI Generated Quiz</CardTitle>
              <Badge variant="outline" className="text-xs">
                {quiz.module_id}
              </Badge>
              {quiz.lesson_id && (
                <Badge variant="outline" className="text-xs">
                  {quiz.lesson_id}
                </Badge>
              )}
              <Badge className={`text-xs ${statusColors[quiz.status]}`}>
                {quiz.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {quiz.questions.length} questions &bull; Generated {new Date(quiz.generated_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && quiz.status === 'pending' && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(quiz)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Questions preview */}
          <div className="space-y-4">
            {quiz.questions.map((q, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                  <InlineLatex>{q.questionText}</InlineLatex>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`text-xs px-2 py-1.5 rounded border ${
                        opt === q.correctAnswer
                          ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                          : 'bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <InlineLatex>{opt}</InlineLatex>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <InlineLatex>{q.explanation}</InlineLatex>
                </p>
              </div>
            ))}
          </div>

          {/* Rejection reason display */}
          {quiz.status === 'rejected' && quiz.rejection_reason && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <strong>Rejection reason:</strong> {quiz.rejection_reason}
            </div>
          )}

          {/* Actions for pending quizzes */}
          {quiz.status === 'pending' && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {showRejectInput ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (optional)"
                    className="flex-1 text-sm px-3 py-1.5 rounded-md border bg-background"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={loading}
                  >
                    Confirm Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRejectInput(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => onApprove(quiz.id)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReject}
                    disabled={loading}
                    className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
