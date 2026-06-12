'use client'

/**
 * Receipt Check-In Dialog
 *
 * Check-ins require proof of purchase: the user photographs or uploads their
 * receipt, the server verifies it against this business with Gemini vision,
 * and only a verified receipt records the visit (and mission progress).
 */
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, ReceiptText, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface CheckInMissionUpdate {
  missionId: string
  title: string
  currentCount: number
  targetCount: number
  completed: boolean
}

export interface CheckInSuccessResult {
  message: string
  verification: { merchant: string | null; total: number | null }
  missionUpdates: CheckInMissionUpdate[]
}

interface ReceiptCheckInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  businessName: string
  onSuccess: (result: CheckInSuccessResult) => void
  /** Reported when the API says the user already checked in today. */
  onAlreadyCheckedIn?: () => void
}

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024

export function ReceiptCheckInDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
  onSuccess,
  onAlreadyCheckedIn,
}: ReceiptCheckInDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Revoke the previous object URL whenever the preview changes, and the
  // current one on unmount (replacing scattered manual revokes)
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const reset = () => {
    setFile(null)
    setPreviewUrl(null)
    setErrorMessage(null)
    setIsSubmitting(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    if (selected && selected.size > MAX_RECEIPT_BYTES) {
      setErrorMessage('That image is larger than 8MB — try a smaller photo.')
      event.target.value = ''
      return
    }
    setErrorMessage(null)
    setFile(selected)
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null)
  }

  const handleSubmit = async () => {
    if (!file) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const formData = new FormData()
      formData.append('receipt', file)
      const response = await fetch(`/api/businesses/${businessId}/checkin`, {
        method: 'POST',
        body: formData,
      })
      const body = await response.json().catch(() => null)

      if (response.status === 409) {
        onAlreadyCheckedIn?.()
        handleOpenChange(false)
        return
      }
      if (response.status === 422) {
        setErrorMessage(body?.reason ?? 'The receipt could not be verified.')
        return
      }
      if (!response.ok) {
        setErrorMessage(
          body?.reason ?? body?.error ?? 'Failed to check in. Please try again.'
        )
        return
      }

      // Normalize the payload so a server response shape drift can't crash
      // success handlers downstream
      const result = body as Partial<CheckInSuccessResult> | null
      onSuccess({
        message:
          typeof result?.message === 'string'
            ? result.message
            : 'Receipt verified — checked in!',
        verification: {
          merchant: result?.verification?.merchant ?? null,
          total:
            typeof result?.verification?.total === 'number'
              ? result.verification.total
              : null,
        },
        missionUpdates: Array.isArray(result?.missionUpdates)
          ? result.missionUpdates
          : [],
      })
      handleOpenChange(false)
    } catch {
      setErrorMessage('Failed to check in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
            Scan your receipt
          </DialogTitle>
          <DialogDescription>
            Check-ins need proof of purchase. Snap a photo of your receipt
            from {businessName} and we&apos;ll verify it.
          </DialogDescription>
        </DialogHeader>

        {/* No `capture` attribute: it would force the camera on mobile and
            block choosing an existing receipt photo from the gallery/files.
            `accept="image/*"` still offers the camera as one option. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Receipt photo"
          onChange={handleFileChange}
        />

        {previewUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative h-56 w-full overflow-hidden rounded-lg border border-border"
            aria-label="Change receipt photo"
          >
            {/* Local object URL preview — next/image can't optimize blobs */}
            <Image
              src={previewUrl}
              alt="Receipt preview"
              fill
              unoptimized
              className="object-contain bg-muted"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ScanLine className="h-7 w-7" aria-hidden="true" />
            <span className="text-sm font-medium">
              Take a photo or choose an image
            </span>
            <span className="text-xs">JPG or PNG, up to 8MB</span>
          </button>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!file || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Verifying receipt…
            </>
          ) : (
            'Verify & Check In'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
