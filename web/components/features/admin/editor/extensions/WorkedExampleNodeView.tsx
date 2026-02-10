'use client'

import { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { BookOpen, Settings, Trash2, Plus, X } from 'lucide-react'
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
import type { WorkedExampleStep } from './WorkedExampleNode'

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-green-500/10 text-green-600' },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-500/10 text-yellow-600' },
  advanced: { label: 'Advanced', color: 'bg-red-500/10 text-red-600' },
}

export function WorkedExampleNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false)

  const { content, steps, difficulty } = node.attrs as {
    content: string
    steps: WorkedExampleStep[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  }

  const config = difficultyConfig[difficulty] || difficultyConfig.beginner

  const updateStep = (index: number, field: keyof WorkedExampleStep, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    updateAttributes({ steps: newSteps })
  }

  const addStep = () => {
    updateAttributes({
      steps: [...steps, { instruction: `Step ${steps.length + 1}`, hint: '', answer: '' }],
    })
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      updateAttributes({ steps: steps.filter((_, i) => i !== index) })
    }
  }

  return (
    <NodeViewWrapper className="my-4">
      <div className="border rounded-lg bg-muted/30 p-4 group relative">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Worked Example
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>
                {config.label}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">{content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {steps.length} step{steps.length !== 1 ? 's' : ''}
            </p>
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
                  <DialogTitle>Edit Worked Example</DialogTitle>
                  <DialogDescription>
                    Configure the example problem and its step-by-step solution.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Problem Title</Label>
                    <Input
                      value={content}
                      onChange={(e) => updateAttributes({ content: e.target.value })}
                      placeholder="e.g., Calculate Rocket Thrust"
                    />
                  </div>
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Steps</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addStep}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Step
                      </Button>
                    </div>
                    {steps.map((step, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Step {index + 1}</span>
                          {steps.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeStep(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={step.instruction}
                            onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                            placeholder="Step instruction..."
                          />
                          <Input
                            value={step.hint || ''}
                            onChange={(e) => updateStep(index, 'hint', e.target.value)}
                            placeholder="Hint (optional)..."
                          />
                          <Textarea
                            value={step.answer}
                            onChange={(e) => updateStep(index, 'answer', e.target.value)}
                            placeholder="Answer/solution..."
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
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
