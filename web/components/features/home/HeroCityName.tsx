'use client'

import { useEffect, useState } from 'react'
import { getCachedLocation, reverseGeocodeCity } from '@/lib/location'
import type { LatLng } from '@/types/business'

const DEFAULT_CITY = 'Your City'
const CITY_CACHE_KEY = 'user_city_name'
// Match the location cache TTL so the city follows location changes
const CITY_CACHE_TTL = 60 * 60 * 1000

function toTitleCase(name: string): string {
  return name.replace(/\S+/g, (word) => word[0].toUpperCase() + word.slice(1))
}

/**
 * Hero headline city — resolves the visitor's city from their location and
 * renders it in the brand gradient, falling back to "Your City".
 *
 * Resolution order: cached city name → cached coordinates (set by the
 * Discover page) → GPS read. The GPS read may show the browser's permission
 * prompt on first visit; if the user has denied location, it is skipped and
 * the default stays.
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

    const cachedLocation = getCachedLocation()
    if (cachedLocation) {
      void lookup(cachedLocation)
      return () => {
        cancelled = true
      }
    }

    // GPS read — skipped only when the user has explicitly denied location
    const readPosition = () => {
      if (cancelled || !navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return
          void lookup({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          // Denied or unavailable — keep the default
        },
        { maximumAge: CITY_CACHE_TTL, timeout: 10000 }
      )
    }

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state !== 'denied') readPosition()
        })
        .catch(readPosition)
    } else {
      readPosition()
    }

    return () => {
      cancelled = true
    }
  }, [])

  return <span className="gradient-text">{city}</span>
}
