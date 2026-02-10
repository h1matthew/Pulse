'use client'

import { useState, useEffect } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Video, Settings, Sparkles, Trash2, Loader2, Play, Eye, EyeOff } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'
import { VideoGenerateModal } from '../VideoGenerateModal'
import { DynamicVideoPlayer } from '@/components/features/video/DynamicVideoPlayer'

interface VideoComposition {
  id: string
  name: string
  slug: string
  description: string | null
  code?: string
  width?: number
  height?: number
  fps?: number
  duration_frames?: number
}

export function VideoNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [open, setOpen] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [videos, setVideos] = useState<VideoComposition[]>([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedVideoData, setSelectedVideoData] = useState<VideoComposition | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const { compositionId, description } = node.attrs

  // Find the selected video name
  const selectedVideo = videos.find(v => v.id === compositionId)

  // Fetch video compositions when dialog opens
  useEffect(() => {
    if (open && videos.length === 0) {
      setLoading(true)
      const supabase = createClient()
      supabase
        .from('video_compositions')
        .select('id, name, slug, description')
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setVideos(data)
          }
          setLoading(false)
        })
    }
  }, [open, videos.length])

  // Fetch full video data when compositionId changes and preview is shown
  useEffect(() => {
    if (!compositionId || !showPreview) {
      setSelectedVideoData(null)
      return
    }

    setLoadingPreview(true)
    fetch(`/api/videos/${compositionId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.code) {
          setSelectedVideoData(data)
        }
      })
      .catch(err => {
        console.error('Error fetching video for preview:', err)
      })
      .finally(() => {
        setLoadingPreview(false)
      })
  }, [compositionId, showPreview])

  return (
    <NodeViewWrapper className="my-4">
      <div className="border rounded-lg bg-muted/30 p-4 group relative">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Video Block
              </span>
              {compositionId && (
                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                  Configured
                </span>
              )}
            </div>
            <p className="text-sm text-foreground truncate">
              {selectedVideo ? selectedVideo.name : description}
            </p>
            {compositionId && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedVideo?.slug || compositionId}
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Video Block</DialogTitle>
                  <DialogDescription>
                    Select an existing video composition or generate a new one.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Video Composition</Label>
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading compositions...
                      </div>
                    ) : (
                      <Select
                        value={compositionId || 'none'}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            updateAttributes({ compositionId: null })
                            setShowPreview(false)
                            setSelectedVideoData(null)
                          } else {
                            const video = videos.find(v => v.id === value)
                            updateAttributes({
                              compositionId: value,
                              description: video?.name || description,
                            })
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a video composition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">No video selected</span>
                          </SelectItem>
                          {videos.map((video) => (
                            <SelectItem key={video.id} value={video.id}>
                              <div className="flex flex-col">
                                <span>{video.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {video.slug}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {videos.length === 0 && !loading && (
                      <p className="text-xs text-muted-foreground">
                        No video compositions found. Generate one below.
                      </p>
                    )}
                  </div>

                  {/* Preview Section */}
                  {compositionId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Play className="h-3.5 w-3.5" />
                          Preview
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
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Show
                            </>
                          )}
                        </Button>
                      </div>
                      {showPreview && (
                        <div className="border rounded-lg overflow-hidden bg-muted/30">
                          {loadingPreview ? (
                            <div className="aspect-video flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : selectedVideoData?.code ? (
                            <DynamicVideoPlayer
                              code={selectedVideoData.code}
                              width={selectedVideoData.width || 1280}
                              height={selectedVideoData.height || 720}
                              fps={selectedVideoData.fps || 30}
                              durationInFrames={selectedVideoData.duration_frames || 300}
                              showError
                              className="aspect-video"
                            />
                          ) : (
                            <div className="aspect-video flex items-center justify-center text-sm text-muted-foreground">
                              Unable to load preview
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Description / Notes</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => updateAttributes({ description: e.target.value })}
                      placeholder="Describe the animation needed..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add notes about what this video should show. Useful for planning.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setOpen(false)
                        setShowGenerateModal(true)
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate New Video with AI
                    </Button>
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

      <VideoGenerateModal
        open={showGenerateModal}
        onOpenChange={setShowGenerateModal}
        onVideoCreated={(id) => {
          // Refresh the videos list and select the new one
          const supabase = createClient()
          supabase
            .from('video_compositions')
            .select('id, name, slug, description')
            .order('name', { ascending: true })
            .then(({ data }) => {
              if (data) {
                setVideos(data)
                const newVideo = data.find(v => v.id === id)
                updateAttributes({
                  compositionId: id,
                  description: newVideo?.name || description,
                })
              }
            })
        }}
      />
    </NodeViewWrapper>
  )
}
