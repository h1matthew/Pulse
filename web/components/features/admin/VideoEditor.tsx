'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Trash2, Sparkles, Code, Play, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { DbVideoComposition, ContentStatus } from '@/types/admin'
import { DynamicVideoPlayer } from '@/components/features/video/DynamicVideoPlayer'
import { VideoCodeChatDialog } from '@/components/features/admin/VideoCodeChatDialog'

interface VideoEditorProps {
  video: DbVideoComposition
}

export function VideoEditor({ video }: VideoEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: video.name,
    slug: video.slug,
    description: video.description || '',
    code: video.code,
    width: video.width,
    height: video.height,
    fps: video.fps,
    duration_frames: video.duration_frames,
    status: video.status,
  })

  // Generate video code with AI
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want the video to show')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video code')
      }

      const data = await response.json()
      setFormData(prev => ({
        ...prev,
        code: data.code,
      }))
      toast.success('Code generated! Review and save when ready.')
    } catch (err) {
      console.error('Error generating video:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate video code')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('video_compositions')
        .update(formData)
        .eq('id', video.id)

      if (updateError) throw updateError

      setSuccess(true)
      toast.success('Video saved')
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error updating video:', err)
      setError(err instanceof Error ? err.message : 'Failed to update video')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video? This cannot be undone.')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('video_compositions').delete().eq('id', video.id)

      if (error) throw error

      toast.success('Video deleted')
      router.push('/admin/videos')
    } catch (err) {
      console.error('Error deleting video:', err)
      toast.error('Failed to delete video')
    }
  }

  return (
    <div className="space-y-6">
      <VideoCodeChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        code={formData.code}
        onCodeUpdate={(newCode) => setFormData((prev) => ({ ...prev, code: newCode }))}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/videos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {video.name}
              </h1>
              <Badge variant={video.status === 'published' ? 'default' : 'secondary'}>
                {video.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {video.width}x{video.height} @ {video.fps}fps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setChatOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat about code
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="code" className="space-y-6">
          <TabsList>
            <TabsTrigger value="code" className="gap-2">
              <Code className="h-4 w-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Play className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Regenerate with AI
            </TabsTrigger>
          </TabsList>

          {/* Code Tab */}
          <TabsContent value="code">
            <Card>
              <CardHeader>
                <CardTitle>Remotion Code</CardTitle>
                <CardDescription>
                  Edit the Remotion component code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.code}
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="// Write your Remotion code here..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Animation Preview</CardTitle>
                <CardDescription>
                  Preview how the animation will appear in lessons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicVideoPlayer
                  code={formData.code}
                  width={formData.width}
                  height={formData.height}
                  fps={formData.fps}
                  durationInFrames={formData.duration_frames}
                  showError
                  className="rounded-lg overflow-hidden border"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Generation Tab */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>Regenerate with AI</CardTitle>
                <CardDescription>
                  Describe changes and AI will regenerate the code (this will replace existing code)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">Describe the animation</Label>
                  <Textarea
                    id="aiPrompt"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    rows={4}
                    placeholder="E.g., Create an animation showing..."
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={generating || !aiPrompt.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Regenerate Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Video Details */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Video Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                Video updated successfully
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, width: parseInt(e.target.value) || 1280 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, height: parseInt(e.target.value) || 720 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fps">FPS</Label>
                <Input
                  id="fps"
                  type="number"
                  value={formData.fps}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, fps: parseInt(e.target.value) || 30 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Frames</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_frames}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      duration_frames: parseInt(e.target.value) || 300,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(status: ContentStatus) =>
                  setFormData(prev => ({ ...prev, status }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Video ID: <code className="bg-muted px-1 rounded">{video.id}</code></p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/admin/videos">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
