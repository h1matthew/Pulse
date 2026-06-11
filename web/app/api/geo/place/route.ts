import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/security/rateLimitHelper'

interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

/**
 * GET /api/geo/place?placeId=ChIJ...
 *
 * Resolves a Google place id (from /api/geo/autocomplete) to coordinates and a
 * short "City, ST" label, using the Geocoding API with the key kept
 * server-side. Place ids are interchangeable between the Places and Geocoding
 * APIs, so this avoids a separate Place Details call.
 *
 * Responds `{ location: { lat, lng } | null, label: string | null }` — null
 * when the key is missing, the id is invalid, or the lookup fails.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, 'general')
  if (rateLimitResponse) return rateLimitResponse

  const placeId = request.nextUrl.searchParams.get('placeId')?.trim() ?? ''

  // Google place ids are URL-safe tokens; reject anything that clearly is not one.
  if (!placeId || placeId.length > 512 || !/^[\w-]+$/.test(placeId)) {
    return NextResponse.json({ error: 'Invalid place id' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ location: null, label: null })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`
    )
    if (!response.ok) return NextResponse.json({ location: null, label: null })

    const data = await response.json()
    const result = data.results?.[0]
    if (data.status !== 'OK' || !result?.geometry?.location) {
      return NextResponse.json({ location: null, label: null })
    }

    const { lat, lng } = result.geometry.location
    const components: AddressComponent[] = result.address_components ?? []
    const findType = (type: string) => components.find((c) => c.types.includes(type))

    const city =
      findType('locality') ?? findType('sublocality') ?? findType('postal_town')
    const state = findType('administrative_area_level_1')
    const zip = findType('postal_code')

    // Prefer "City, ST"; fall back to a zip-style or formatted label.
    let label: string | null = null
    if (city && state) {
      label = `${city.long_name}, ${state.short_name}`
    } else if (zip && state) {
      label = `${zip.long_name}, ${state.short_name}`
    } else {
      label = result.formatted_address?.split(',').slice(0, 2).join(',').trim() ?? null
    }

    return NextResponse.json({ location: { lat, lng }, label })
  } catch {
    return NextResponse.json({ location: null, label: null })
  }
}
