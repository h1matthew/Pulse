'use client'

import { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { HelpCircle, Settings, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-green-500/10 text-green-600' },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-500/10 text-yellow-600' },
  advanced: { label: 'Advanced', color: 'bg-red-500/10 text-red-600' },
}

const revealModeLabels = {
  click: 'Click to Reveal',
  input: 'Type Answer',
  hints: 'Progressive Hints',
}

export function PracticeProblemNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false)

  const { content, answer, hints, difficulty, revealMode, inputPlaceholder } = node.attrs as {
    content: string
    answer: string
    hints: string[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    revealMode: 'click' | 'input' | 'hints'
    inputPlaceholder: string
  }

  const config = difficultyConfig[difficulty] || difficultyConfig.beginner

  const updateHint = (index: number, value: string) => {
    const newHints = [...hints]
    newHints[index] = value
    updateAttributes({ hints: newHints })
  }

  const addHint = () => {
    updateAttributes({ hints: [...hints, ''] })
  }

  const removeHint = (index: number) => {
    updateAttributes({ hints: hints.filter((_, i) => i !== index) })
  }

  return (
    <NodeViewWrapper className="my-4">
      <div className="border rounded-lg bg-muted/30 p-4 group relative border-dashed border-primary/30">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Practice Problem
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {revealModeLabels[revealMode]}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{content}</p>
            {hints.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {hints.length} hint{hints.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Practice Problem</DialogTitle>
                  <DialogDescription>
                    Configure the problem, answer, and how students reveal it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Problem</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => updateAttributes({ content: e.target.value })}
                      placeholder="Enter the practice problem..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select
                        value={difficulty}
                        onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') =>
                          updateAttributes({ difficulty: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reveal Mode</Label>
                      <Select
                        value={revealMode}
                        onValueChange={(value: 'click' | 'input' | 'hints') =>
                          updateAttributes({ revealMode: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="click">Click to Reveal</SelectItem>
                          <SelectItem value="input">Type Answer</SelectItem>
                          <SelectItem value="hints">Progressive Hints</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Answer</Label>
                    <Textarea
                      value={answer}
                      onChange={(e) => updateAttributes({ answer: e.target.value })}
                      placeholder="The correct answer..."
                      rows={2}
                    />
                  </div>
                  {revealMode === 'input' && (
                    <div className="space-y-2">
                      <Label>Input Placeholder</Label>
                      <Input
                        value={inputPlaceholder}
                        onChange={(e) => updateAttributes({ inputPlaceholder: e.target.value })}
                        placeholder="Enter your answer..."
                      />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Hints (optional)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addHint}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Hint
                      </Button>
                    </div>
                    {hints.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hints added. Add hints to help students.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {hints.map((hint, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-16">
                              Hint {index + 1}
                            </span>
                            <Input
                              value={hint}
                              onChange={(e) => updateHint(index, e.target.value)}
                              placeholder="Enter hint..."
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeHint(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteNode()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}
