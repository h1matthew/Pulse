'use client'

import { useState, useEffect } from 'react'
import { MapPin, LocateFixed, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ChangeLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearchZip: (zipCode: string) => Promise<void>
  onUseGps: () => void
  initialZip?: string
  gpsDisabled: boolean
}

export function ChangeLocationDialog({
  open,
  onOpenChange,
  onSearchZip,
  onUseGps,
  initialZip,
  gpsDisabled,
}: ChangeLocationDialogProps) {
  const [zipCode, setZipCode] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (open && initialZip) {
      setZipCode(initialZip)
    }
  }, [open, initialZip])

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zipCode.trim()) return

    setIsSearching(true)
    await onSearchZip(zipCode.trim())
    setIsSearching(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Change Location
          </DialogTitle>
          <DialogDescription>
            Enter a zip code or use your current location.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleZipSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter zip code..."
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            maxLength={10}
            className="flex-1"
            disabled={isSearching}
            autoFocus
          />
          <Button
            type="submit"
            disabled={!zipCode.trim() || isSearching}
            variant="secondary"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-1" />
                Search
              </>
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          onClick={onUseGps}
          disabled={gpsDisabled}
          variant="outline"
          className="w-full gap-2"
        >
          {!gpsDisabled ? (
            <>
              <LocateFixed className="h-4 w-4" />
              Use my current location
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Getting location...
            </>
          )}
        </Button>

        {gpsDisabled && (
          <p className="text-xs text-muted-foreground text-center">
            Location access was denied in your browser settings.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
