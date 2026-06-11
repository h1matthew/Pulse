import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/security/rateLimitHelper'

/**
 * GET /api/geo/autocomplete?q=san anto
 *
 * Returns US place suggestions (cities, towns, and zip codes) for a typed
 * query using the Places API (New) Autocomplete, with the Google key kept
 * server-side. Restricted to `(regions)` so it suggests locations to search
 * near — never individual businesses — and to US results only.
 *
 * Responds `{ suggestions: { id, label }[] }` where `id` is a Google place id
 * (resolve to coordinates via /api/geo/place). Always 200 with an empty list
 * when the key is missing, the query is too short, or the lookup fails, so the
 * UI degrades gracefully to plain zip-code entry.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, 'general')
  if (rateLimitResponse) return rateLimitResponse

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  // Require a couple of characters to avoid burning quota on single keystrokes.
  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: query.slice(0, 100),
        includedPrimaryTypes: ['(regions)'],
        includedRegionCodes: ['us'],
        languageCode: 'en',
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] })
    }

    const data = await response.json()
    const suggestions = ((data.suggestions ?? []) as Array<{
      placePrediction?: { placeId?: string; text?: { text?: string } }
    }>)
      .map((s) => ({
        id: s.placePrediction?.placeId ?? '',
        label: s.placePrediction?.text?.text ?? '',
      }))
      .filter((s) => s.id && s.label)
      .slice(0, 6)

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
