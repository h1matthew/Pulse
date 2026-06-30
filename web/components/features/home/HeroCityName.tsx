'use client'

import { useEffect, useState } from 'react'
import { getCachedLocation, reverseGeocodeCity } from '@/lib/location'
import type { LatLng } from '@/types/business'

const DEFAULT_CITY = 'San Antonio'
const CITY_CACHE_KEY = 'user_city_name'
// Match the location cache TTL so the city follows location changes
const CITY_CACHE_TTL = 60 * 60 * 1000

function toTitleCase(name: string): string {
  return name.replace(/\S+/g, (word) => word[0].toUpperCase() + word.slice(1))
}

/**
 * Hero headline city — resolves the visitor's city from their explicitly
 * chosen location (cached by the Discover page's location picker) and renders
 * it in the brand gradient, falling back to "San Antonio".
 *
 * The homepage never auto-reads live GPS, so the hero is deterministic for
 * first-time visitors and presentations: it shows San Antonio unless the
 * visitor has explicitly set a different location via Discover.
 */
export function HeroCityName() {
  const [city, setCity] = useState(DEFAULT_CITY)

  useEffect(() => {
    let cancelled = false

    const lookup = async (location: LatLng) => {
      const name = await reverseGeocodeCity(location)
      if (!name) return
      try {
        localStorage.setItem(
          CITY_CACHE_KEY,
          JSON.stringify({ city: name, timestamp: Date.now() })
        )
      } catch {
        // localStorage not available
      }
      if (!cancelled) setCity(toTitleCase(name))
    }

    // Recently resolved city name first — no network round-trip
    try {
      const cached = localStorage.getItem(CITY_CACHE_KEY)
      if (cached) {
        const { city: name, timestamp } = JSON.parse(cached)
        if (name && Date.now() - timestamp < CITY_CACHE_TTL) {
          setCity(toTitleCase(name))
          return
        }
      }
    } catch {
      // localStorage not available
    }

    // Use the visitor's explicitly chosen location (set via Discover), if any.
    const cachedLocation = getCachedLocation()
    if (cachedLocation) {
      void lookup(cachedLocation)
    }
    // No cached location → keep the San Antonio default.

    return () => {
      cancelled = true
    }
  }, [])

  return <span className="gradient-text">{city}</span>
}
