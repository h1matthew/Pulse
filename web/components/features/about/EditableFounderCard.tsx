'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Camera, Pencil, Check, X, Move, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Founder } from './FounderCard'

interface EditableFounderCardProps {
  founder: Founder
  index: number
}

export function EditableFounderCard({ founder, index }: EditableFounderCardProps) {
  const fallbackUrl = `/founders/${founder.id}.png`
  const [imageUrl, setImageUrl] = useState(founder.image_url || fallbackUrl)
  const [hasCustomImage, setHasCustomImage] = useState(!!founder.image_url)
  const [offsetX, setOffsetX] = useState(founder.image_offset_x)
  const [offsetY, setOffsetY] = useState(founder.image_offset_y)
  const [zoom, setZoom] = useState(founder.image_zoom || 1)
  const [bio, setBio] = useState(founder.bio)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [isRepositioning, setIsRepositioning] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showControls, setShowControls] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const savingRef = useRef(false)
  const savedStateRef = useRef({ x: offsetX, y: offsetY, zoom })

  // Use refs for drag state so handlers don't need re-creation
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const latestOffsetRef = useRef({ x: offsetX, y: offsetY })
  latestOffsetRef.current = { x: offsetX, y: offsetY }

  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  // Keep track of whether mouse is over the card
  useEffect(() => {
    const handleMouseEnter = () => setShowControls(true)
    const handleMouseLeave = (e: MouseEvent) => {
      // Don't hide if repositioning or if mouse is over controls
      if (isRepositioning) return
      const relatedTarget = e.relatedTarget as HTMLElement
      if (controlsRef.current?.contains(relatedTarget)) return
      setShowControls(false)
    }

    const card = imageContainerRef.current?.parentElement
    if (card) {
      card.addEventListener('mouseenter', handleMouseEnter)
      card.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (card) {
        card.removeEventListener('mouseenter', handleMouseEnter)
        card.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [isRepositioning])

  const handlePhotoClick = () => {
    if (!isRepositioning) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const res = await fetch(`/api/admin/founders/${founder.id}/photo`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to upload photo')
        return
      }

      const data = await res.json()
      setImageUrl(data.image_url)
      setHasCustomImage(true)
    } catch {
      alert('Failed to upload photo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove this photo? It will revert to the default placeholder.')) {
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/founders/${founder.id}/photo`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        alert('Failed to remove photo')
        return
      }

      setImageUrl(fallbackUrl)
      setHasCustomImage(false)
      // Reset offsets to default
      setOffsetX(50)
      setOffsetY(50)
      setZoom(1)
    } catch {
      alert('Failed to remove photo')
    } finally {
      setIsSaving(false)
    }
  }

  const startReposition = () => {
    savedStateRef.current = { x: offsetX, y: offsetY, zoom }
    setIsRepositioning(true)
    setShowControls(true)
  }

  const cancelReposition = () => {
    setOffsetX(savedStateRef.current.x)
    setOffsetY(savedStateRef.current.y)
    setZoom(savedStateRef.current.zoom)
    setIsRepositioning(false)
  }

  const savePosition = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setIsSaving(true)

    try {
      const res = await fetch(`/api/admin/founders/${founder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_offset_x: offsetX,
          image_offset_y: offsetY,
          image_zoom: zoom,
        }),
      })

      if (!res.ok) {
        alert('Failed to save position')
        return
      }

      setIsRepositioning(false)
    } catch {
      alert('Failed to save position')
    } finally {
      setIsSaving(false)
      savingRef.current = false
    }
  }

  // --- Drag handlers using native events on the container ---
  const onPointerDown = useCallback((e: PointerEvent) => {
    const container = imageContainerRef.current
    if (!container) return
    e.preventDefault()
    container.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: latestOffsetRef.current.x,
      offsetY: latestOffsetRef.current.y,
    }
    container.classList.add('cursor-grabbing')
    container.classList.remove('cursor-grab')
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return
    const container = imageContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * -100
    const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * -100

    // Allow dragging beyond image bounds (-50% to 150% range)
    setOffsetX(Math.max(-50, Math.min(150, dragStartRef.current.offsetX + deltaX)))
    setOffsetY(Math.max(-50, Math.min(150, dragStartRef.current.offsetY + deltaY)))
  }, [])

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false
    const container = imageContainerRef.current
    if (container) {
      container.classList.remove('cursor-grabbing')
      container.classList.add('cursor-grab')
    }
  }, [])

  // --- Scroll wheel zoom ---
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setZoom(z => Math.round(Math.max(0.5, Math.min(3, z + delta)) * 100) / 100)
  }, [])

  // Attach / detach native event listeners when reposition mode toggles
  useEffect(() => {
    const container = imageContainerRef.current
    if (!container) return

    if (isRepositioning) {
      container.addEventListener('pointerdown', onPointerDown)
      container.addEventListener('pointermove', onPointerMove)
      container.addEventListener('pointerup', onPointerUp)
      container.addEventListener('wheel', onWheel, { passive: false })
    }

    return () => {
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('wheel', onWheel)
      isDraggingRef.current = false
    }
  }, [isRepositioning, onPointerDown, onPointerMove, onPointerUp, onWheel])

  const saveBio = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setIsSaving(true)

    try {
      const res = await fetch(`/api/admin/founders/${founder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      })

      if (!res.ok) {
        alert('Failed to save bio')
        return
      }

      setIsEditingBio(false)
    } catch {
      alert('Failed to save bio')
    } finally {
      setIsSaving(false)
      savingRef.current = false
    }
  }

  const cancelBioEdit = () => {
    setBio(founder.bio)
    setIsEditingBio(false)
  }

  const adjustZoom = (delta: number) => {
    setZoom(z => Math.round(Math.max(0.5, Math.min(3, z + delta)) * 100) / 100)
  }

  return (
    <div
      className="animate-fade-in-up group/card flex flex-col items-center text-center"
      style={{ animationDelay: `${0.1 + index * 0.15}s` }}
    >
      <div className="relative mb-6">
        {/* Glow ring behind image */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/20 via-chart-3/20 to-chart-2/20 opacity-0 blur-md transition-opacity duration-500 group-hover/card:opacity-100" />
        <div
          ref={imageContainerRef}
          className={cn(
            'relative h-44 w-44 overflow-hidden rounded-full border-2 border-border/50 bg-muted transition-all duration-300 group-hover/card:border-primary/30 group-hover/card:shadow-lg group-hover/card:shadow-primary/10',
            isRepositioning && 'cursor-grab ring-2 ring-primary ring-offset-2 ring-offset-background'
          )}
        >
          <Image
            src={imageUrl}
            alt={`Photo of ${founder.name}`}
            width={200}
            height={200}
            className={cn(
              'h-full w-full object-cover pointer-events-none select-none',
              isRepositioning && 'transition-none'
            )}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: `${offsetX}% ${offsetY}%`,
            }}
          />

          {/* Upload overlay (shown on hover, hidden during reposition) */}
          {!isRepositioning && (
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={isUploading}
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/card:opacity-100"
            >
              <Camera className="h-6 w-6" />
              <span className="text-xs font-medium">
                {isUploading ? 'Uploading...' : 'Change Photo'}
              </span>
            </button>
          )}

          {/* Repositioning overlay with instructions */}
          {isRepositioning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/30 text-white pointer-events-none">
              <Move className="h-6 w-6" />
              <span className="text-xs font-medium">Drag to move</span>
              <span className="text-[10px] opacity-75">Scroll to zoom</span>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Photo controls */}
        <div
          ref={controlsRef}
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 transition-all duration-200',
            (showControls || isRepositioning) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          )}
        >
          {!isRepositioning ? (
            <>
              <button
                type="button"
                onClick={startReposition}
                className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground hover:bg-accent"
                title="Reposition photo"
              >
                <Move className="h-3 w-3" />
                Move
              </button>
              {hasCustomImage && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isSaving}
                  className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10"
                  title="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => adjustZoom(-0.1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Zoom out"
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                <span className="min-w-[3rem] text-center text-xs font-medium text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => adjustZoom(0.1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Zoom in"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
              </div>

              {/* Position values */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>X: {Math.round(offsetX)}%</span>
                <span>Y: {Math.round(offsetY)}%</span>
              </div>

              {/* Save/Cancel buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={savePosition}
                  disabled={isSaving}
                  className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelReposition}
                  className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-xl font-bold text-foreground">{founder.name}</h2>
      <p className="mt-1 text-sm font-medium text-primary">{founder.role}</p>

      {/* Editable bio */}
      {isEditingBio ? (
        <div className="mt-3 w-full">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={saveBio}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
            <button
              type="button"
              onClick={cancelBioEdit}
              className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="group/bio relative mt-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {bio}
          </p>
          <button
            type="button"
            onClick={() => setIsEditingBio(true)}
            className="absolute -right-6 top-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/bio:opacity-100"
            title="Edit bio"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
