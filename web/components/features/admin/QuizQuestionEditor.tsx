'use client'

import { useState } from 'react'
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import type { DbQuizQuestion } from '@/types/admin'

interface QuizQuestionEditorProps {
  question: DbQuizQuestion
  index: number
  onUpdate: (updates: Partial<DbQuizQuestion>) => void
  onDelete: () => void
}

export function QuizQuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
}: QuizQuestionEditorProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [localQuestion, setLocalQuestion] = useState(question.question_text)
  const [localOptions, setLocalOptions] = useState<string[]>(question.options || [])

  const handleQuestionBlur = () => {
    if (localQuestion !== question.question_text) {
      onUpdate({ question_text: localQuestion })
    }
  }

  const handleAddOption = () => {
    const newOptions = [...localOptions, `Option ${String.fromCharCode(65 + localOptions.length)}`]
    setLocalOptions(newOptions)
    onUpdate({ options: newOptions })
  }

  const handleRemoveOption = (idx: number) => {
    const newOptions = localOptions.filter((_, i) => i !== idx)
    setLocalOptions(newOptions)
    // If removing the correct answer, reset to first option
    if (question.correct_answer === localOptions[idx]) {
      onUpdate({ options: newOptions, correct_answer: newOptions[0] || '' })
    } else {
      onUpdate({ options: newOptions })
    }
  }

  const handleOptionChange = (idx: number, value: string) => {
    const newOptions = [...localOptions]
    const oldValue = newOptions[idx]
    newOptions[idx] = value
    setLocalOptions(newOptions)

    // If this was the correct answer, update it
    if (question.correct_answer === oldValue) {
      onUpdate({ options: newOptions, correct_answer: value })
    } else {
      onUpdate({ options: newOptions })
    }
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-lg bg-card"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="text-muted-foreground cursor-grab">
            <GripVertical className="h-4 w-4" />
          </div>

          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-medium text-primary">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{question.question_text}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {question.question_type}
              </Badge>
              {question.difficulty && (
                <Badge variant="secondary" className="text-xs">
                  {question.difficulty}
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 pt-0 space-y-4 border-t">
          {/* Question Text */}
          <div className="space-y-2">
            <Label>Question</Label>
            <Textarea
              value={localQuestion}
              onChange={e => setLocalQuestion(e.target.value)}
              onBlur={handleQuestionBlur}
              rows={2}
              placeholder="Enter your question..."
            />
          </div>

          {/* Question Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={question.question_type}
                onValueChange={question_type =>
                  onUpdate({
                    question_type: question_type as 'multiple-choice' | 'true-false' | 'free-response',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="true-false">True/False</SelectItem>
                  <SelectItem value="free-response">Free Response</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={question.difficulty || 'recall'}
                onValueChange={difficulty =>
                  onUpdate({
                    difficulty: difficulty as 'recall' | 'understanding' | 'calculation' | 'analysis',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recall">Recall</SelectItem>
                  <SelectItem value="understanding">Understanding</SelectItem>
                  <SelectItem value="calculation">Calculation</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Multiple Choice Options */}
          {question.question_type === 'multiple-choice' && (
            <div className="space-y-2">
              <Label>Options (click to set correct answer)</Label>
              <div className="space-y-2">
                {localOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={question.correct_answer === option ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => onUpdate({ correct_answer: option })}
                    >
                      {question.correct_answer === option ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{String.fromCharCode(65 + idx)}</span>
                      )}
                    </Button>
                    <Input
                      value={option}
                      onChange={e => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                    {localOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveOption(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {localOptions.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* True/False Options */}
          {question.question_type === 'true-false' && (
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <Select
                value={question.correct_answer}
                onValueChange={correct_answer => onUpdate({ correct_answer })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">True</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Free Response Answer */}
          {question.question_type === 'free-response' && (
            <div className="space-y-2">
              <Label>Expected Answer (for reference)</Label>
              <Textarea
                value={question.correct_answer}
                onChange={e => onUpdate({ correct_answer: e.target.value })}
                rows={2}
                placeholder="Enter the expected answer..."
              />
            </div>
          )}

          {/* Hint */}
          <div className="space-y-2">
            <Label>Hint (optional)</Label>
            <Input
              value={question.hint || ''}
              onChange={e => onUpdate({ hint: e.target.value })}
              placeholder="A hint to help students..."
            />
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Explanation</Label>
            <Textarea
              value={question.explanation || ''}
              onChange={e => onUpdate({ explanation: e.target.value })}
              rows={2}
              placeholder="Explain why this is the correct answer..."
            />
          </div>

          {/* Topic Tags */}
          <div className="space-y-2">
            <Label>Topic Tags (comma-separated)</Label>
            <Input
              value={(question.topic_tags || []).join(', ')}
              onChange={e => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                onUpdate({ topic_tags: tags })
              }}
              placeholder="thrust, newton's third law, propulsion"
            />
          </div>

          {/* Auto-graded toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-graded</Label>
              <p className="text-xs text-muted-foreground">
                Automatically grade this question
              </p>
            </div>
            <Switch
              checked={question.is_auto_graded}
              onCheckedChange={is_auto_graded => onUpdate({ is_auto_graded })}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
