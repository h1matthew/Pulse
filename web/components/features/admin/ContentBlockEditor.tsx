'use client'

import { useState } from 'react'
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Type,
  Hash,
  Calculator,
  Image,
  Video,
  AlertCircle,
  List,
  BookOpen,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import type { DbContentBlock, ContentBlockType } from '@/types/admin'

interface ContentBlockEditorProps {
  block: DbContentBlock
  index: number
  onUpdate: (updates: Partial<DbContentBlock>) => void
  onDelete: () => void
}

const BLOCK_ICONS: Record<ContentBlockType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  heading: <Hash className="h-4 w-4" />,
  subheading: <Hash className="h-3 w-3" />,
  equation: <Calculator className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  diagram: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  callout: <AlertCircle className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
  'worked-example': <BookOpen className="h-4 w-4" />,
  'practice-problem': <HelpCircle className="h-4 w-4" />,
}

const BLOCK_LABELS: Record<ContentBlockType, string> = {
  text: 'Text',
  heading: 'Heading',
  subheading: 'Subheading',
  equation: 'Equation',
  image: 'Image',
  diagram: 'Diagram',
  video: 'Video',
  callout: 'Callout',
  list: 'List',
  'worked-example': 'Worked Example',
  'practice-problem': 'Practice Problem',
}

export function ContentBlockEditor({
  block,
  index,
  onUpdate,
  onDelete,
}: ContentBlockEditorProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [localContent, setLocalContent] = useState(block.content)

  // Debounced save
  const handleContentChange = (content: string) => {
    setLocalContent(content)
  }

  const handleContentBlur = () => {
    if (localContent !== block.content) {
      onUpdate({ content: localContent })
    }
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-lg bg-card"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="text-muted-foreground cursor-grab">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            {BLOCK_ICONS[block.type]}
            <span className="text-xs font-medium uppercase">{BLOCK_LABELS[block.type]}</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm truncate text-foreground">
              {block.content || <span className="text-muted-foreground italic">Empty</span>}
            </p>
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
          {/* Text/Heading/Subheading Block */}
          {(block.type === 'text' || block.type === 'heading' || block.type === 'subheading') && (
            <div className="space-y-2">
              <Label>Content</Label>
              {block.type === 'text' ? (
                <Textarea
                  value={localContent}
                  onChange={e => handleContentChange(e.target.value)}
                  onBlur={handleContentBlur}
                  rows={4}
                  placeholder="Enter text content..."
                />
              ) : (
                <Input
                  value={localContent}
                  onChange={e => handleContentChange(e.target.value)}
                  onBlur={handleContentBlur}
                  placeholder="Enter heading..."
                />
              )}
            </div>
          )}

          {/* Equation Block */}
          {block.type === 'equation' && (
            <div className="space-y-2">
              <Label>LaTeX Equation</Label>
              <Textarea
                value={localContent}
                onChange={e => handleContentChange(e.target.value)}
                onBlur={handleContentBlur}
                rows={3}
                placeholder="E.g., F = m \times a"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use LaTeX notation. Example: F = m \times a, \frac{`{1}`}{`{2}`}mv^2
              </p>
            </div>
          )}

          {/* Callout Block */}
          {block.type === 'callout' && (
            <div className="space-y-2">
              <Label>Callout Content</Label>
              <Textarea
                value={localContent}
                onChange={e => handleContentChange(e.target.value)}
                onBlur={handleContentBlur}
                rows={3}
                placeholder="Important information to highlight..."
              />
            </div>
          )}

          {/* List Block */}
          {block.type === 'list' && (
            <div className="space-y-2">
              <Label>List Title (optional)</Label>
              <Input
                value={localContent}
                onChange={e => handleContentChange(e.target.value)}
                onBlur={handleContentBlur}
                placeholder="List title..."
              />
              <Label>List Items (one per line)</Label>
              <Textarea
                value={(block.items || []).join('\n')}
                onChange={e => {
                  const items = e.target.value.split('\n').filter(Boolean)
                  onUpdate({ items })
                }}
                rows={4}
                placeholder="Item 1&#10;Item 2&#10;Item 3"
              />
            </div>
          )}

          {/* Image Block */}
          {(block.type === 'image' || block.type === 'diagram') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={block.image_url || ''}
                  onChange={e => onUpdate({ image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Alt Text</Label>
                <Input
                  value={block.image_alt || ''}
                  onChange={e => onUpdate({ image_alt: e.target.value })}
                  placeholder="Describe the image..."
                />
              </div>
              <div className="space-y-2">
                <Label>Caption</Label>
                <Input
                  value={localContent}
                  onChange={e => handleContentChange(e.target.value)}
                  onBlur={handleContentBlur}
                  placeholder="Optional caption..."
                />
              </div>
            </div>
          )}

          {/* Video Block */}
          {block.type === 'video' && (
            <div className="space-y-2">
              <Label>Video Caption</Label>
              <Input
                value={localContent}
                onChange={e => handleContentChange(e.target.value)}
                onBlur={handleContentBlur}
                placeholder="Describe what the video shows..."
              />
              <p className="text-xs text-muted-foreground">
                Video composition will be linked separately via the video manager
              </p>
            </div>
          )}

          {/* Worked Example Block */}
          {block.type === 'worked-example' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Problem Statement</Label>
                <Textarea
                  value={localContent}
                  onChange={e => handleContentChange(e.target.value)}
                  onBlur={handleContentBlur}
                  rows={3}
                  placeholder="Describe the problem to solve..."
                />
              </div>
              <div className="space-y-2">
                <Label>Solution Steps (JSON)</Label>
                <Textarea
                  value={JSON.stringify(block.steps || [], null, 2)}
                  onChange={e => {
                    try {
                      const steps = JSON.parse(e.target.value)
                      onUpdate({ steps })
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder='[{"instruction": "Step 1", "answer": "Result"}]'
                />
              </div>
            </div>
          )}

          {/* Practice Problem Block */}
          {block.type === 'practice-problem' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Problem Statement</Label>
                <Textarea
                  value={localContent}
                  onChange={e => handleContentChange(e.target.value)}
                  onBlur={handleContentBlur}
                  rows={3}
                  placeholder="Describe the problem..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={block.difficulty || 'beginner'}
                    onValueChange={difficulty =>
                      onUpdate({ difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced' })
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
                    value={block.reveal_mode || 'click'}
                    onValueChange={reveal_mode =>
                      onUpdate({ reveal_mode: reveal_mode as 'click' | 'input' | 'hints' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="click">Click to reveal</SelectItem>
                      <SelectItem value="input">User input</SelectItem>
                      <SelectItem value="hints">Progressive hints</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Answer</Label>
                <Input
                  value={block.answer || ''}
                  onChange={e => onUpdate({ answer: e.target.value })}
                  placeholder="Correct answer..."
                />
              </div>
              <div className="space-y-2">
                <Label>Hints (one per line)</Label>
                <Textarea
                  value={(block.hints || []).join('\n')}
                  onChange={e => {
                    const hints = e.target.value.split('\n').filter(Boolean)
                    onUpdate({ hints })
                  }}
                  rows={3}
                  placeholder="Hint 1&#10;Hint 2"
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
