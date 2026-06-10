import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/security/rateLimitHelper'

interface AddressComponent {
  long_name: string
  types: string[]
}

/**
 * GET /api/geo/city?lat=..&lng=..
 *
 * Reverse geocodes coordinates to a city name ("Diamond Bar") using the
 * server-side Google API key, so the key is never shipped to the browser.
 * Responds `{ city: string | null }` — null when the key is missing, the
 * lookup fails, or no city-level component exists at those coordinates.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, 'general')
  if (rateLimitResponse) return rateLimitResponse

  // Missing params must fail: Number(null) is 0, a "valid" coordinate
  const latRaw = request.nextUrl.searchParams.get('lat')
  const lngRaw = request.nextUrl.searchParams.get('lng')
  const lat = latRaw?.trim() ? Number(latRaw) : NaN
  const lng = lngRaw?.trim() ? Number(lngRaw) : NaN

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ city: null })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality&key=${apiKey}`
    )
    if (!response.ok) return NextResponse.json({ city: null })

    const data = await response.json()
    if (data.status !== 'OK' || !data.results?.[0]) {
      return NextResponse.json({ city: null })
    }

    const components: AddressComponent[] =
      data.results[0].address_components ?? []
    const city =
      components.find((c) => c.types.includes('locality')) ??
      components.find((c) => c.types.includes('sublocality')) ??
      components.find((c) => c.types.includes('postal_town'))

    return NextResponse.json({ city: city?.long_name ?? null })
  } catch {
    return NextResponse.json({ city: null })
  }
}
