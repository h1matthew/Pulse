import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/security/rateLimitHelper'

/**
 * GET /api/geo/zip?zip=78205
 *
 * Geocodes a US zip code to coordinates using the server-side Google API
 * key, so the key is never shipped to the browser (same pattern as
 * /api/geo/city). Uses a component filter (postal_code + country:US) so
 * 5-digit queries always resolve as US zip codes instead of being treated
 * as an ambiguous free-text address.
 *
 * Responds `{ location: { lat, lng } | null, city: string | null }` —
 * location is null when the key is missing, the lookup fails, or the zip
 * does not exist.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, 'general')
  if (rateLimitResponse) return rateLimitResponse

  const zipRaw = request.nextUrl.searchParams.get('zip')?.trim() ?? ''
  const zipMatch = zipRaw.match(/^(\d{5})(-\d{4})?$/)

  if (!zipMatch) {
    return NextResponse.json({ error: 'Invalid zip code' }, { status: 400 })
  }
  const zip = zipMatch[1]

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ location: null, city: null })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${zip}%7Ccountry:US&key=${apiKey}`
    )
    if (!response.ok) return NextResponse.json({ location: null, city: null })

    const data = await response.json()
    const result = data.results?.[0]
    if (data.status !== 'OK' || !result?.geometry?.location) {
      return NextResponse.json({ location: null, city: null })
    }

    const { lat, lng } = result.geometry.location
    const components: Array<{ long_name: string; types: string[] }> =
      result.address_components ?? []
    const city =
      components.find((c) => c.types.includes('locality')) ??
      components.find((c) => c.types.includes('sublocality')) ??
      components.find((c) => c.types.includes('postal_town'))

    return NextResponse.json({
      location: { lat, lng },
      city: city?.long_name ?? null,
    })
  } catch {
    return NextResponse.json({ location: null, city: null })
  }
}
