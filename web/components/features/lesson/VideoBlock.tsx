'use client'

import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getComposition } from '@/remotion/registry'
import { PlayCircle, Loader2 } from 'lucide-react'
import { DynamicVideoPlayer } from '@/components/features/video/DynamicVideoPlayer'

// Lazy-load Remotion Player - only loaded when a composition is actually found
const RemotionPlayer = dynamic(
  () => import('@remotion/player').then(mod => ({ default: mod.Player })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    ),
  }
)

// UUID regex pattern to detect database IDs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface VideoBlockProps {
  compositionId: string
}

interface VideoData {
  id: string
  code: string
  width: number
  height: number
  fps: number
  duration_frames: number
  name: string
}

export function VideoBlock({ compositionId }: VideoBlockProps) {
  const isUUID = UUID_REGEX.test(compositionId)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(isUUID)
  const [error, setError] = useState<string | null>(null)

  // For UUIDs, fetch from database
  useEffect(() => {
    if (!isUUID) return

    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${compositionId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Video not found')
          } else {
            setError('Failed to load video')
          }
          setLoading(false)
          return
        }

        const data = await response.json()
        setVideoData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching video:', err)
        setError('Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [compositionId, isUUID])

  // For non-UUIDs (legacy registry lookup)
  const composition = useMemo(() => {
    if (isUUID) return undefined
    return getComposition(compositionId)
  }, [compositionId, isUUID])

  // Show loading state for database videos
  if (isUUID && loading) {
    return (
      <div className="my-6 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-muted/30">
        <div className="aspect-video flex flex-col items-center justify-center gap-3 p-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading animation...</p>
        </div>
      </div>
    )
  }

  // If UUID and have data, use DynamicVideoPlayer
  if (isUUID && videoData) {
    return (
      <div className="my-6 rounded-xl overflow-hidden border border-border/50 shadow-lg">
        <DynamicVideoPlayer
          code={videoData.code}
          width={videoData.width}
          height={videoData.height}
          fps={videoData.fps}
          durationInFrames={videoData.duration_frames}
          controls
          loop
          className="aspect-video"
        />
      </div>
    )
  }

  // If UUID but error or no data, show fallback
  if (isUUID && (error || !videoData)) {
    return (
      <div className="my-6 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-muted/30">
        <div className="aspect-video flex flex-col items-center justify-center gap-3 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <PlayCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground">Video unavailable</p>
          <p className="text-xs text-muted-foreground">{error || 'Could not load animation'}</p>
        </div>
      </div>
    )
  }

  // Legacy: registry lookup for non-UUID composition IDs
  if (composition) {
    return (
      <div className="my-6 rounded-xl overflow-hidden border border-border/50 shadow-lg">
        <div className="aspect-video">
          <RemotionPlayer
            component={composition.component}
            durationInFrames={composition.durationInFrames}
            fps={composition.fps}
            compositionWidth={composition.width}
            compositionHeight={composition.height}
            style={{ width: '100%', height: '100%' }}
            controls
            autoPlay={false}
            loop
          />
        </div>
      </div>
    )
  }

  // Fallback for unknown composition IDs
  const label = compositionId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-muted/30">
      <div className="aspect-video flex flex-col items-center justify-center gap-3 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <PlayCircle className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">Animation coming soon</p>
      </div>
    </div>
  )
}
