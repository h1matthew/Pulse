'use client'

import { useState } from 'react'
import { MapPin, LocateFixed, Search, Loader2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface LocationPromptProps {
  onAllowLocation: () => void
  onSearchZip: (zipCode: string) => void
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
  isLoading: boolean
}

export function LocationPrompt({
  onAllowLocation,
  onSearchZip,
  permission,
  isLoading,
}: LocationPromptProps) {
  const [zipCode, setZipCode] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zipCode.trim()) return

    setIsSearching(true)
    await onSearchZip(zipCode.trim())
    setIsSearching(false)
  }

  const isDenied = permission === 'denied'

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-dashed border-2">
        <CardContent className="pt-6 pb-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDenied ? 'Location Access Denied' : 'Find Businesses Near You'}
            </h3>
            <p className="text-sm text-muted-foreground">
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
            <div className="rounded-lg bg-muted p-4 text-left space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Settings2 className="h-4 w-4" />
                Enable location in your browser:
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-5 list-disc">
                <li>Click the lock/info icon in your address bar</li>
                <li>Find "Location" permissions</li>
                <li>Change to "Allow" and refresh the page</li>
              </ul>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or enter zip code</span>
            </div>
          </div>

          <form onSubmit={handleZipSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter zip code..."
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              maxLength={10}
              className="flex-1"
              disabled={isSearching}
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
        </CardContent>
      </Card>
    </div>
  )
}
