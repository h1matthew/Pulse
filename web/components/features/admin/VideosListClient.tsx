'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Video, Plus, Play, Clock, BookOpen, Filter, ArrowUpDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VideoGenerateModal } from './editor/VideoGenerateModal'
import type { VideoWithUsage } from '@/lib/admin'
import type { DbModule } from '@/types/admin'

interface VideosListClientProps {
  videos: VideoWithUsage[]
  modules: DbModule[]
}

type SortOption = 'newest' | 'oldest' | 'name' | 'duration'

export function VideosListClient({ videos, modules }: VideosListClientProps) {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [generateModalOpen, setGenerateModalOpen] = useState(false)

  const filteredVideos = useMemo(() => {
    let result = [...videos]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        v =>
          v.name.toLowerCase().includes(searchLower) ||
          v.description?.toLowerCase().includes(searchLower) ||
          v.slug.toLowerCase().includes(searchLower)
      )
    }

    // Module filter
    if (moduleFilter !== 'all') {
      result = result.filter(v =>
        v.usedIn.some(u => u.moduleId === moduleFilter)
      )
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'duration':
        result.sort((a, b) => b.duration_frames / b.fps - a.duration_frames / a.fps)
        break
    }

    return result
  }, [videos, search, moduleFilter, sortBy])

  // Get unique modules that have videos
  const modulesWithVideos = useMemo(() => {
    const moduleIds = new Set<string>()
    videos.forEach(v => v.usedIn.forEach(u => moduleIds.add(u.moduleId)))
    return modules.filter(m => moduleIds.has(m.id))
  }, [videos, modules])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Video Compositions</h1>
          <p className="text-sm text-muted-foreground">
            Manage Remotion video animations for lessons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setGenerateModalOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
          <Link href="/admin/videos/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Video
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modulesWithVideos.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.icon} {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy('newest')}>
              Newest first {sortBy === 'newest' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('oldest')}>
              Oldest first {sortBy === 'oldest' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('name')}>
              Name A-Z {sortBy === 'name' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('duration')}>
              Duration (longest) {sortBy === 'duration' && '✓'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {(search || moduleFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setModuleFilter('all')
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredVideos.length} of {videos.length} videos
      </p>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">
            {videos.length === 0 ? 'No video compositions yet' : 'No videos match your filters'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {videos.length === 0
              ? 'Create Remotion video animations to use in your lessons'
              : 'Try adjusting your search or filter criteria'}
          </p>
          {videos.length === 0 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => setGenerateModalOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
              <Link href="/admin/videos/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Video
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map(video => (
            <Link
              key={video.id}
              href={`/admin/videos/${video.id}`}
              className="group border rounded-lg bg-card overflow-hidden hover:border-primary/20 hover:shadow-lg transition-all"
            >
              {/* Thumbnail placeholder */}
              <div className="aspect-video bg-muted/50 flex items-center justify-center relative">
                <Video className="h-10 w-10 text-muted-foreground/30" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                    {video.name}
                  </h3>
                  <Badge
                    variant={video.status === 'published' ? 'default' : 'secondary'}
                    className="text-xs flex-shrink-0"
                  >
                    {video.status}
                  </Badge>
                </div>
                {video.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {video.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span>{video.width}x{video.height}</span>
                  <span>{video.fps} fps</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(video.duration_frames / video.fps).toFixed(1)}s
                  </span>
                </div>

                {/* Usage info */}
                {video.usedIn.length > 0 ? (
                  <div className="flex items-start gap-1.5 text-xs">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-muted-foreground">
                      Used in{' '}
                      {video.usedIn.length === 1 ? (
                        <span className="text-foreground">
                          {video.usedIn[0].lessonTitle}
                        </span>
                      ) : (
                        <span className="text-foreground">
                          {video.usedIn.length} lessons
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    Not used in any lesson
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <VideoGenerateModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onVideoCreated={(id) => {
          // Redirect to edit the new video
          window.location.href = `/admin/videos/${id}`
        }}
      />
    </div>
  )
}
