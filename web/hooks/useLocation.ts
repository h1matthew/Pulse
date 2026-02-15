'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { LatLng } from '@/types/business'

// ============================================================================
// Types
// ============================================================================

interface GeolocationState {
  location: LatLng | null
  error: string | null
  loading: boolean
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
}

interface UseLocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  onSuccess?: (location: LatLng) => void
  onError?: (error: string) => void
}

// Track if we've shown the error toast recently to prevent spam
let lastErrorTime = 0
const ERROR_COOLDOWN = 3000 // 3 seconds

// ============================================================================
// Geocoding Utilities
// ============================================================================

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  try {
    // Use Google Maps Geocoding API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return null
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    )

    if (!response.ok) throw new Error('Geocoding failed')

    const data = await response.json()
    if (data.status !== 'OK' || !data.results?.[0]) return null

    const { lat, lng } = data.results[0].geometry.location
    return { lat, lng }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
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
 * Calculate distance between two points in miles
 */
export function calculateDistance(point1: LatLng, point2: LatLng): number {
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

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`
  }
  return `${Math.round(miles)} mi`
}

// ============================================================================
// Main Hook
// ============================================================================

export function useLocation(options: UseLocationOptions = {}): GeolocationState & {
  requestLocation: (force?: boolean) => void
  watchLocation: () => (() => void)
} {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    onSuccess,
    onError,
  } = options

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    permission: 'unknown',
  })

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const location: LatLng = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    }

    setState(prev => ({
      ...prev,
      location,
      loading: false,
      error: null,
      permission: 'granted',
    }))

    onSuccess?.(location)
  }, [onSuccess])

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unable to get location'
    let newPermission: GeolocationState['permission'] = state.permission

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.'
        newPermission = 'denied'
        break
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable. Please try again.'
        break
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.'
        break
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false,
      permission: newPermission,
    }))

    // Prevent spamming error toasts
    const now = Date.now()
    if (now - lastErrorTime > ERROR_COOLDOWN) {
      lastErrorTime = now
      onError?.(errorMessage)
    }
  }, [onError, state.permission])

  const requestLocation = useCallback((force = false) => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }))
      return
    }

    // Reset permission state when force is true
    if (force) {
      setState(prev => ({ ...prev, permission: 'unknown' }))
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout: force ? 15000 : timeout, // Longer timeout when forcing
        maximumAge: force ? 0 : maximumAge // Get fresh location when forcing
      }
    )
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError])

  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }))
      return () => {}
    }

    setState(prev => ({ ...prev, loading: true }))

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError])

  // Check permission on mount (if supported)
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null

    const checkPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName })

          setState(prev => ({
            ...prev,
            permission: permissionStatus?.state as 'granted' | 'denied' | 'prompt' || 'unknown',
          }))

          // Auto-request if permission already granted
          if (permissionStatus.state === 'granted') {
            requestLocation()
          }

          // Listen for permission changes
          permissionStatus.onchange = () => {
            setState(prev => ({
              ...prev,
              permission: permissionStatus?.state as 'granted' | 'denied' | 'prompt' || 'unknown',
            }))
          }
        } catch {
          // Permission API not supported, will fallback to getCurrentPosition
        }
      }
    }

    checkPermission()

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null
      }
    }
  }, [requestLocation])

  return {
    ...state,
    requestLocation,
    watchLocation,
  }
}

// ============================================================================
// Check-in Verification Hook
// ============================================================================

interface UseCheckInVerificationOptions {
  businessLocation: LatLng
  maxDistanceMiles?: number
}

export function useCheckInVerification(
  options: UseCheckInVerificationOptions
): {
  canCheckIn: boolean
  distance: number | null
  loading: boolean
  error: string | null
  verifyLocation: () => Promise<boolean>
} {
  const { businessLocation, maxDistanceMiles = 0.5 } = options // Default 0.5 miles
  const { location, loading, error, requestLocation } = useLocation()

  const distance = location
    ? calculateDistance(location, businessLocation)
    : null

  const canCheckIn = distance !== null && distance <= maxDistanceMiles

  const verifyLocation = useCallback(async (): Promise<boolean> => {
    if (!location) {
      requestLocation()
      return false
    }

    return canCheckIn
  }, [location, canCheckIn, requestLocation])

  return {
    canCheckIn,
    distance,
    loading,
    error,
    verifyLocation,
  }
}
