'use client'

import { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Info, AlertTriangle, Lightbulb, AlertCircle, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import type { CalloutType } from './CalloutNode'

const calloutConfig: Record<CalloutType, { icon: typeof Info; bgColor: string; textColor: string; borderColor: string; label: string }> = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500/30',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-500/30',
    label: 'Warning',
  },
  tip: {
    icon: Lightbulb,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600',
    borderColor: 'border-green-500/30',
    label: 'Tip',
  },
  important: {
    icon: AlertCircle,
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600',
    borderColor: 'border-red-500/30',
    label: 'Important',
  },
}

export function CalloutNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false)

  const { content, type } = node.attrs as { content: string; type: CalloutType }
  const config = calloutConfig[type] || calloutConfig.info
  const Icon = config.icon

  return (
    <NodeViewWrapper className="my-4">
      <div className={`border rounded-lg p-4 group relative ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${config.textColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium uppercase tracking-wide ${config.textColor}`}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Callout</DialogTitle>
                  <DialogDescription>
                    Configure the callout type and content.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={type}
                      onValueChange={(value: CalloutType) => updateAttributes({ type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="tip">Tip</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={content}
                      onChange={(e) => updateAttributes({ content: e.target.value })}
                      placeholder="Enter callout text..."
                      rows={4}
                    />
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
