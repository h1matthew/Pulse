'use client'

import { useState, useEffect } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Calculator, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import katex from 'katex'

export function EquationNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false)
  const [renderedHtml, setRenderedHtml] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { latex, display } = node.attrs

  useEffect(() => {
    try {
      const html = katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        errorColor: '#ef4444',
      })
      setRenderedHtml(html)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid LaTeX')
      setRenderedHtml('')
    }
  }, [latex, display])

  return (
    <NodeViewWrapper className="my-4">
      <div className="border rounded-lg bg-muted/30 p-4 group relative">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Equation
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${display ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-500/10 text-gray-600'}`}>
                {display ? 'Display' : 'Inline'}
              </span>
            </div>
            {error ? (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            ) : (
              <div
                className={`text-foreground ${display ? 'text-center py-2' : ''}`}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            )}
            <code className="text-xs text-muted-foreground block mt-2 font-mono">
              {latex}
            </code>
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
                  <DialogTitle>Edit Equation</DialogTitle>
                  <DialogDescription>
                    Enter a LaTeX equation. Use standard LaTeX notation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>LaTeX</Label>
                    <Textarea
                      value={latex}
                      onChange={(e) => updateAttributes({ latex: e.target.value })}
                      placeholder="e.g., F = ma"
                      rows={3}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Examples: F = ma, \frac{`{d}`}{`{dt}`}v, \sqrt{`{x^2 + y^2}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Display Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Display mode centers the equation on its own line
                      </p>
                    </div>
                    <Switch
                      checked={display}
                      onCheckedChange={(checked) => updateAttributes({ display: checked })}
                    />
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                    {error ? (
                      <div className="text-sm text-destructive">{error}</div>
                    ) : (
                      <div
                        className={display ? 'text-center' : ''}
                        dangerouslySetInnerHTML={{ __html: renderedHtml }}
                      />
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
