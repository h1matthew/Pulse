'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { LatLng } from '@/types/business'
import { calculateDistance } from '@/lib/location'

// Re-export utility functions from lib/location for backwards compatibility
export {
  geocodeAddress,
  geocodeZipCode,
  getCachedLocation,
  cacheLocation,
  reverseGeocode,
  formatDistance,
  type GeocodeResult,
} from '@/lib/location'

// Also re-export calculateDistance for external use
export { calculateDistance }

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

