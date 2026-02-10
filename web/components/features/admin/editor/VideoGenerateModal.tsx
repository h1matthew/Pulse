'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check, Play, Eye, EyeOff, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { DynamicVideoPlayer } from '@/components/features/video/DynamicVideoPlayer'
import { VideoCodeChatDialog } from '@/components/features/admin/VideoCodeChatDialog'

interface VideoGenerateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVideoCreated?: (compositionId: string) => void
}

export function VideoGenerateModal({ open, onOpenChange, onVideoCreated }: VideoGenerateModalProps) {
  const [step, setStep] = useState<'prompt' | 'preview' | 'saving'>('prompt')
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    try {
      const response = await fetch('/api/admin/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video code')
      }

      const data = await response.json()
      setGeneratedCode(data.code || '')
      setName(data.name || 'new-animation')
      setStep('preview')
    } catch (error) {
      console.error('Error generating video:', error)
      toast.error('Failed to generate video code')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedCode || !name) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Generate a slug from the name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { data, error } = await supabase
        .from('video_compositions')
        .insert({
          name,
          slug,
          description: prompt,
          code: generatedCode,
          width: 1280,
          height: 720,
          fps: 30,
          duration_frames: 300,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Video composition saved')
      onVideoCreated?.(data.id)
      handleClose()
    } catch (error) {
      console.error('Error saving video:', error)
      toast.error('Failed to save video composition')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setStep('prompt')
    setPrompt('')
    setName('')
    setGeneratedCode('')
    setShowPreview(true)
    setChatOpen(false)
    onOpenChange(false)
  }

  return (
    <>
      <VideoCodeChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        code={generatedCode}
        onCodeUpdate={(newCode) => setGeneratedCode(newCode)}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'prompt' && 'Generate Video Animation'}
            {step === 'preview' && 'Preview Generated Code'}
          </DialogTitle>
          <DialogDescription>
            {step === 'prompt' &&
              'Describe the animation you want to create. The AI will generate Remotion code.'}
            {step === 'preview' && 'Review and save the generated Remotion composition code.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'prompt' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="video-prompt">Animation Description</Label>
              <Textarea
                id="video-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A rocket launching from a pad showing thrust force vectors pointing downward and the reaction force pushing the rocket up. Include exhaust flames and a countdown."
                rows={6}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Tips for better results:</p>
              <ul className="list-disc list-inside pl-2">
                <li>Describe physics concepts clearly (forces, vectors, trajectories)</li>
                <li>Mention specific elements (arrows, labels, particles)</li>
                <li>Include timing details (what happens first, transitions)</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            {/* Animation Preview Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5" />
                  Animation Preview
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-7 px-2 text-xs"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Show Preview
                    </>
                  )}
                </Button>
              </div>
              {showPreview && (
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  <DynamicVideoPlayer
                    code={generatedCode}
                    width={1280}
                    height={720}
                    showError
                    className="aspect-video"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-name">Composition Name</Label>
              <Input
                id="video-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., rocket-launch-animation"
              />
            </div>
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <Label>Generated Code</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-7 px-2 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="flex-1 overflow-auto border rounded-lg bg-muted/30 min-h-[120px]">
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                  {generatedCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'prompt' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('prompt')}>
                Back
              </Button>
              <Button variant="outline" onClick={() => setChatOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat about code
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Composition'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  )
}
