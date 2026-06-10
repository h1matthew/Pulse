import type { LatLng } from '@/types/business'

export interface GeocodeResult {
  location: LatLng | null
  error?: string
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return { location: null, error: 'API key not configured' }
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      console.error('Geocoding HTTP error:', response.status)
      return { location: null, error: `HTTP error: ${response.status}` }
    }

    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Geocoding API error:', data.status, data.error_message)
      return {
        location: null,
        error: data.error_message || `Geocoding failed: ${data.status}`
      }
    }

    if (!data.results?.[0]) {
      return { location: null, error: 'No results found' }
    }

    const { lat, lng } = data.results[0].geometry.location
    return { location: { lat, lng } }
  } catch (error) {
    console.error('Geocoding error:', error)
    return { location: null, error: 'Network error occurred' }
  }
}

/**
 * Geocode a US zip code to coordinates.
 * Goes through our own /api/geo/zip route so the Google key stays
 * server-side. Caches results in localStorage for better performance.
 */
export async function geocodeZipCode(zipCode: string): Promise<LatLng | null> {
  if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode.trim())) {
    return null
  }

  const trimmedZip = zipCode.trim()

  // Check localStorage cache first
  try {
    const cacheKey = `zip_geocode_${trimmedZip}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const { location, timestamp } = JSON.parse(cached)
      // Cache valid for 30 days
      if (Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000) {
        return location
      }
    }
  } catch {
    // localStorage not available
  }

  // Geocode the zip via the server-side route
  let location: LatLng | null = null
  try {
    const response = await fetch(`/api/geo/zip?zip=${encodeURIComponent(trimmedZip)}`)
    if (!response.ok) return null

    const data = await response.json()
    if (
      data.location &&
      typeof data.location.lat === 'number' &&
      typeof data.location.lng === 'number'
    ) {
      location = data.location
    }
  } catch (error) {
    console.error('Zip geocoding error:', error)
    return null
  }

  // Cache the result
  if (location) {
    try {
      const cacheKey = `zip_geocode_${trimmedZip}`
      localStorage.setItem(cacheKey, JSON.stringify({
        location,
        timestamp: Date.now()
      }))
    } catch {
      // localStorage not available
    }
  }

  return location
}

/**
 * Get cached location from localStorage
 */
export const getCachedLocation = (): LatLng | null => {
  try {
    const cached = localStorage.getItem('user_location')
    if (cached) {
      const { location, timestamp } = JSON.parse(cached)
      // Cache valid for 1 hour
      if (Date.now() - timestamp < 60 * 60 * 1000) {
        return location
      }
    }
  } catch {
    // localStorage not available
  }
  return null
}

/**
 * Save location to localStorage cache
 */
export const cacheLocation = (location: LatLng): void => {
  try {
    localStorage.setItem('user_location', JSON.stringify({
      location,
      timestamp: Date.now()
    }))
  } catch {
    // localStorage not available
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(location: LatLng): Promise<string | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return null
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${apiKey}`
    )

    if (!response.ok) throw new Error('Reverse geocoding failed')

    const data = await response.json()
    if (data.status !== 'OK' || !data.results?.[0]) return null

    return data.results[0].formatted_address
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Reverse geocode coordinates to just the city name (e.g. "Diamond Bar").
 * Goes through our own /api/geo/city route so the Google key stays
 * server-side. Returns null when the lookup fails or no city is found.
 */
export async function reverseGeocodeCity(location: LatLng): Promise<string | null> {
  try {
    const response = await fetch(`/api/geo/city?lat=${location.lat}&lng=${location.lng}`)
    if (!response.ok) return null

    const data = await response.json()
    return typeof data.city === 'string' && data.city ? data.city : null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Calculate distance between two points in miles
 */
export const calculateDistance = (point1: LatLng, point2: LatLng): number => {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(point2.lat - point1.lat)
  const dLon = toRadians(point2.lng - point1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

/**
 * Save location source and label to localStorage cache
 */
export const cacheLocationSource = (source: 'gps' | 'zip', label: string): void => {
  try {
    localStorage.setItem('user_location_source', JSON.stringify({
      source,
      label,
      timestamp: Date.now()
    }))
  } catch {
    // localStorage not available
  }
}

/**
 * Get cached location source from localStorage
 */
export const getCachedLocationSource = (): { source: 'gps' | 'zip'; label: string } | null => {
  try {
    const cached = localStorage.getItem('user_location_source')
    if (cached) {
      const { source, label, timestamp } = JSON.parse(cached)
      // Cache valid for 1 hour (same TTL as location cache)
      if (Date.now() - timestamp < 60 * 60 * 1000) {
        return { source, label }
      }
    }
  } catch {
    // localStorage not available
  }
  return null
}

/**
 * Format distance for display
 */
export const formatDistance = (miles: number): string => {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`
  }
  return `${Math.round(miles)} mi`
}
