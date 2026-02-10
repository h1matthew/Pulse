'use client'

import { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ImageIcon, Settings, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function ImageNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false)

  const { src, alt, caption } = node.attrs

  return (
    <NodeViewWrapper className="my-4">
      <div className="border rounded-lg bg-muted/30 p-4 group relative">
        <div className="flex items-start gap-4">
          {src ? (
            <div className="flex-1">
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded-lg"
              />
              {caption && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {caption}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Image Block
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click settings to configure image URL
                </p>
              </div>
            </>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Image</DialogTitle>
                  <DialogDescription>
                    Enter the image URL and optional alt text and caption.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input
                      value={src}
                      onChange={(e) => updateAttributes({ src: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alt Text</Label>
                    <Input
                      value={alt}
                      onChange={(e) => updateAttributes({ alt: e.target.value })}
                      placeholder="Describe the image..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Caption (optional)</Label>
                    <Input
                      value={caption}
                      onChange={(e) => updateAttributes({ caption: e.target.value })}
                      placeholder="Image caption..."
                    />
                  </div>
                  {src && (
                    <div className="border rounded-lg p-2 bg-muted/30">
                      <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                      <img
                        src={src}
                        alt={alt}
                        className="max-w-full h-auto rounded max-h-48 object-contain"
                      />
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive bg-background/80"
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
