/**
 * External Review Sync - Server-Side Functions
 *
 * Fetches reviews from OpenWeb Ninja's Business Reviews API (v2)
 * and syncs them into the Supabase `reviews` table via the
 * `sync_google_reviews` RPC function.
 *
 * These functions use server-only APIs (Supabase server client, next/headers).
 * DO NOT import this file in Client Components!
 */

import { createClient } from '@/lib/supabase/server'
import type { SyncResult } from './sync-shared'

const OPENWEBNINJA_API_KEY = process.env.OPENWEBNINJA_API_KEY || ''
const API_BASE_URL = 'https://api.openwebninja.com/local-business-data'

// OpenWeb Ninja review response types
interface OWNReview {
  review_id: string
  review_text: string | null
  rating: number
  review_datetime_utc: string
  author_name: string
  author_photo_url: string | null
  author_review_count: number
  like_count: number
  owner_response_text: string | null
  review_photos: string[] | null
}

interface OWNReviewsResponse {
  status?: string
  request_id: string
  parameters: Record<string, unknown>
  data: {
    reviews: OWNReview[]
    total_reviews: number
    rating: number
  }
}

export type { SyncResult }

/**
 * Sync external reviews for a business using OpenWeb Ninja Reviews API.
 * Called from API routes; handles the entire sync process including DB updates.
 */
export async function syncGoogleReviews(
  businessId: string,
  placeId: string
): Promise<SyncResult> {
  const supabase = await createClient()

  try {
    if (!OPENWEBNINJA_API_KEY) {
      return {
        synced: 0,
        skipped: true,
        error: 'OpenWeb Ninja API key not configured',
      }
    }

    // Fetch reviews from OpenWeb Ninja
    const url = new URL(`${API_BASE_URL}/business-reviews-v2`)
    url.searchParams.set('business_id', placeId)
    url.searchParams.set('limit', '20')
    url.searchParams.set('sort_by', 'newest')
    url.searchParams.set('region', 'us')
    url.searchParams.set('language', 'en')

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': OPENWEBNINJA_API_KEY,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenWeb Ninja Reviews API error:', error)
      return {
        synced: 0,
        skipped: true,
        error: `OpenWeb Ninja API error: ${response.status}`,
      }
    }

    const data: OWNReviewsResponse = await response.json()
    const reviews = data.data?.reviews || []

    if (reviews.length > 0) {
      const reviewsToSync = reviews.map((review) => ({
        review_id: review.review_id || '',
        rating: review.rating || 0,
        text: review.review_text || '',
        author_name: review.author_name || 'Anonymous',
        author_photo: review.author_photo_url || null,
        time: review.review_datetime_utc || null,
      }))

      // Call the database function to sync reviews
      const { error: syncError } = await supabase.rpc('sync_google_reviews', {
        p_business_id: businessId,
        p_place_id: placeId,
        p_reviews: reviewsToSync,
      })

      if (syncError) {
        console.error('Error syncing reviews to database:', syncError)
        return {
          synced: 0,
          skipped: true,
          error: 'Failed to sync reviews to database',
        }
      }

      // Update the business's last_synced_at timestamp
      await supabase
        .from('businesses')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_status: 'active',
        })
        .eq('id', businessId)

      return {
        synced: reviewsToSync.length,
        skipped: false,
        googleRating: data.data?.rating,
        googleReviewCount: data.data?.total_reviews,
      }
    }

    // No reviews found, but still update last_synced_at
    await supabase
      .from('businesses')
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: 'active',
      })
      .eq('id', businessId)

    return {
      synced: 0,
      skipped: false,
      googleRating: data.data?.rating,
      googleReviewCount: data.data?.total_reviews,
    }
  } catch (error) {
    console.error('Error syncing reviews:', error)

    // Update sync status to error
    await supabase
      .from('businesses')
      .update({ sync_status: 'error' })
      .eq('id', businessId)

    return {
      synced: 0,
      skipped: true,
      error:
        error instanceof Error ? error.message : 'Unknown error during sync',
    }
  }
}

/**
 * Trigger a background sync without awaiting the result.
 * Useful for API routes where you don't want to block the response.
 */
export function triggerBackgroundSync(
  businessId: string,
  placeId: string
): void {
  // Fire and forget - don't await
  syncGoogleReviews(businessId, placeId).catch((error) => {
    console.error('Background sync failed:', error)
  })
}
