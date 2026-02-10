'use client'

import { Play, Pause, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  totalTime: number
  playbackSpeed: number
  onPlayPause: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
  onSeek: (time: number) => void
  currentPhase?: string
  className?: string
  /** If true, displays progress as percentage instead of time */
  showAsProgress?: boolean
}

const SPEED_OPTIONS = [1, 2, 4, 6, 10]

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0.0s'
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return mins > 0 ? `${mins}:${secs.padStart(4, '0')}` : `${secs}s`
}

function formatProgress(value: number, total: number): string {
  if (!isFinite(value) || isNaN(value)) return '0%'
  const percent = total > 0 ? (value / total) * 100 : 0
  return `${Math.round(percent)}%`
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  totalTime,
  playbackSpeed,
  onPlayPause,
  onReset,
  onSpeedChange,
  onSeek,
  currentPhase,
  className,
  showAsProgress = false,
}: PlaybackControlsProps) {
  const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : 0
  const safeTotalTime = Number.isFinite(totalTime) && totalTime > 0 ? totalTime : 0
  const progress = safeTotalTime > 0 ? (safeCurrentTime / safeTotalTime) * 100 : 0
  const displayCurrent = showAsProgress
    ? formatProgress(safeCurrentTime, safeTotalTime)
    : formatTime(safeCurrentTime)
  const displayTotal = showAsProgress ? '100%' : formatTime(safeTotalTime)

  return (
    <div className={cn("bg-card rounded-lg border border-border/50 p-4", className)}>
      {/* Progress bar / scrubber */}
      <div className="mb-4">
        <div className="relative h-2 bg-muted rounded-full cursor-pointer group">
          {/* Progress fill */}
          <div
            className="absolute h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Scrubber input */}
          <input
            type="range"
            min={0}
            max={safeTotalTime || 1}
            step={0.1}
            value={safeCurrentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* Visual thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        {/* Time display */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="font-mono">{displayCurrent}</span>
          {currentPhase && (
            <span className={cn(
              "font-medium px-2 py-0.5 rounded-full text-[10px]",
              currentPhase === 'powered' || currentPhase === 'First Burn' || currentPhase === 'Second Burn'
                ? 'bg-orange-500/20 text-orange-500' :
              currentPhase === 'coast' || currentPhase === 'Transfer'
                ? 'bg-blue-500/20 text-blue-500' :
              currentPhase === 'descent' || currentPhase === 'Target Orbit'
                ? 'bg-green-500/20 text-green-500' :
              'bg-muted text-muted-foreground'
            )}>
              {currentPhase}
            </span>
          )}
          <span className="font-mono">{displayTotal}</span>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onReset}
            title="Reset"
            className="h-8 w-8"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={onPlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            className="h-8 w-8"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Speed:</span>
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={cn(
                "text-xs px-2 py-1 rounded transition-colors",
                playbackSpeed === speed
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
