'use client'

import { MapPin, LocateFixed, Loader2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LocationSearchBox } from '@/components/features/discover/LocationSearchBox'
import type { LatLng } from '@/types/business'

interface LocationPromptProps {
  onAllowLocation: () => void
  onSelectLocation: (result: { location: LatLng; label: string }) => void
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
  isLoading: boolean
}

export function LocationPrompt({
  onAllowLocation,
  onSelectLocation,
  permission,
  isLoading,
}: LocationPromptProps) {
  const isDenied = permission === 'denied'

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-dashed">
        <CardContent className="pt-6 pb-6 text-center space-y-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-surface-2">
            <MapPin className="h-5 w-5 text-text-tertiary" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h3 className="text-h3 font-medium">
              {isDenied ? 'Location Access Denied' : 'Find Businesses Near You'}
            </h3>
            <p className="text-small text-muted-foreground">
              {isDenied
                ? 'Please enable location access or enter your zip code to discover local businesses.'
                : 'Allow access to your location to see real businesses in your area from Google Places.'}
            </p>
          </div>

          {!isDenied && (
            <Button
              onClick={onAllowLocation}
              disabled={isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <LocateFixed className="h-4 w-4" />
                  Allow Location Access
                </>
              )}
            </Button>
          )}

          {isDenied && (
            <div className="space-y-3 rounded-lg border border-border bg-surface-1 p-4 text-left">
              <div className="flex items-center gap-2 text-small font-medium">
                <Settings2 className="h-4 w-4" />
                Enable location in your browser:
              </div>
              <ul className="ml-5 list-disc space-y-1.5 text-small text-muted-foreground">
                <li>Click the lock/info icon in your address bar</li>
                <li>Find "Location" permissions</li>
                <li>Change to "Allow" and refresh the page</li>
              </ul>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center font-mono text-meta uppercase tracking-[0.02em]">
              <span className="bg-surface-1 px-2 text-text-tertiary">Or search a place</span>
            </div>
          </div>

          <div className="text-left">
            <LocationSearchBox onSelect={onSelectLocation} placeholder="Search city or zip code" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
