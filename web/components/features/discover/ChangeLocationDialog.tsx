'use client'

import { MapPin, LocateFixed, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocationSearchBox } from '@/components/features/discover/LocationSearchBox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { LatLng } from '@/types/business'

interface ChangeLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectLocation: (result: { location: LatLng; label: string }) => void
  onUseGps: () => void
  gpsDisabled: boolean
}

export function ChangeLocationDialog({
  open,
  onOpenChange,
  onSelectLocation,
  onUseGps,
  gpsDisabled,
}: ChangeLocationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Change Location
          </DialogTitle>
          <DialogDescription>
            Search a city or zip code, or use your current location.
          </DialogDescription>
        </DialogHeader>

        <LocationSearchBox
          onSelect={onSelectLocation}
          placeholder="Search city or zip code"
          autoFocus
        />

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
