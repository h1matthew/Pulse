import { createClient } from '@/lib/supabase/server'
import { searchBusinesses as searchGooglePlaces } from '@/lib/google-places'
import { isRealBusinessPlaceTypes, isRealBusinessRecord } from '@/lib/business/display'
import { isChainBusiness } from '@/lib/business/classify'
import { NextResponse } from 'next/server'
import type { LatLng } from '@/types/business'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    )
  }

  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius')
    ? Number(searchParams.get('radius'))
    : 5000

  const location: LatLng | undefined = lat && lng
    ? { lat: Number(lat), lng: Number(lng) }
    : undefined

  const supabase = await createClient()

  try {
    // First, search in our database
    const { data: localBusinesses, error: dbError } = await supabase
      .from('businesses')
      .select('*, category:categories(*)')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(20)

    if (dbError) {
      console.error('Database error:', dbError)
    }

    // Then, search Google Places API for additional results
    let googleResults: Awaited<ReturnType<typeof searchGooglePlaces>> | null = null
    try {
      googleResults = await searchGooglePlaces(query, location, radius)
    } catch (error) {
      console.error('Google Places search error:', error)
    }

    const filteredLocalBusinesses = (localBusinesses || []).filter((business) =>
      isRealBusinessRecord({
        data_source: business.data_source,
        tags: business.tags,
        name: business.name,
        is_chain: business.is_chain,
      })
    )

    // Transform Google Places results to match our format
    const transformedGoogleResults =
      googleResults?.places
        .filter((place) => isRealBusinessPlaceTypes(place.types || []))
        .filter((place) => !isChainBusiness({ name: place.name, tags: place.types || [] }))
        .map((place) => ({
          id: place.place_id,
          name: place.name,
          slug: place.place_id,
          category_id: null,
          description: null,
          short_description: null,
          address: place.formatted_address,
          city: '', // Would need to parse from address
          state: '',
          zip_code: '',
          phone: place.formatted_phone_number || null,
          email: null,
          website: place.website || null,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          hours: place.opening_hours || {},
          photos: place.photos?.map((p) => p.photo_reference) || [],
          logo_url: null,
          owner_id: null,
          is_verified: false,
          is_featured: false,
          price_range: place.price_level || null,
          tags: place.types || [],
          amenities: [],
          average_rating: place.rating || 0,
          review_count: place.user_ratings_total || 0,
          bookmark_count: 0,
          place_id: place.place_id,
          data_source: 'google' as const,
          last_synced_at: new Date().toISOString(),
          sync_status: 'active' as const,
          claimed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: null,
        })) || []

    // Combine results, prioritizing local businesses
    const localIds = new Set(filteredLocalBusinesses.map((business) => business.place_id).filter(Boolean))
    const uniqueGoogleResults = transformedGoogleResults.filter(
      (business) => business.place_id && !localIds.has(business.place_id)
    )

    return NextResponse.json({
      businesses: [...filteredLocalBusinesses, ...uniqueGoogleResults],
      fromCache: googleResults?.fromCache || false,
      localCount: filteredLocalBusinesses.length,
      googleCount: uniqueGoogleResults.length,
    })
  } catch (error) {
    console.error('Error searching businesses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
