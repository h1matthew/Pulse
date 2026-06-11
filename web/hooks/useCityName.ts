'use client'

import { useEffect, useState } from 'react'
import { reverseGeocodeCity } from '@/lib/location'
import type { LatLng } from '@/types/business'

// Shared with HeroCityName so a city resolved in one place is reused everywhere.
const CITY_CACHE_KEY = 'user_city_name'
const CITY_CACHE_TTL = 60 * 60 * 1000

function toTitleCase(name: string): string {
  return name.replace(/\S+/g, (word) => word[0].toUpperCase() + word.slice(1))
}

function readCachedCity(): string | null {
  try {
    const cached = localStorage.getItem(CITY_CACHE_KEY)
    if (!cached) return null
    const { city, timestamp } = JSON.parse(cached)
    if (city && Date.now() - timestamp < CITY_CACHE_TTL) return city
  } catch {
    // localStorage not available
  }
  return null
}

function writeCachedCity(city: string): void {
  try {
    localStorage.setItem(CITY_CACHE_KEY, JSON.stringify({ city, timestamp: Date.now() }))
  } catch {
    // localStorage not available
  }
}

/**
 * Resolve the city name for a location (e.g. "Diamond Bar"), reusing the cached
 * city written by HeroCityName / the Discover page. Returns null until resolved
 * or when no location is available, so callers can fall back to their own label.
 *
 * Pass the visitor's *real* location (not the seed default) — when it's null the
 * hook stays quiet and makes no network call, letting the caller show its own
 * placeholder.
 */
export function useCityName(location: LatLng | null): string | null {
  const [city, setCity] = useState<string | null>(null)

  const lat = location?.lat
  const lng = location?.lng

  useEffect(() => {
    if (lat == null || lng == null) {
      setCity(null)
      return
    }

    let cancelled = false

    const cached = readCachedCity()
    if (cached) {
      setCity(toTitleCase(cached))
      return
    }

    void (async () => {
      const name = await reverseGeocodeCity({ lat, lng })
      if (cancelled || !name) return
      writeCachedCity(name)
      setCity(toTitleCase(name))
    })()

    return () => {
      cancelled = true
    }
  }, [lat, lng])

  return city
}
