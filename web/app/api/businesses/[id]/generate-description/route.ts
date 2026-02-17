import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  generateBusinessDescription,
  generateFallbackDescription,
  scrapeBusinessWebsite,
  summarizeGoogleReviews,
  shouldRegenerateDescription,
} from '@/lib/gemini-business'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: businessId } = await params

  try {
    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        category_id,
        description,
        short_description,
        website,
        place_id,
        city,
        state,
        ai_description,
        ai_description_generated_at,
        categories (name)
      `)
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if we have a fresh AI description
    const forceRegenerate = new URL(request.url).searchParams.get('force') === 'true'

    if (
      !forceRegenerate &&
      business.ai_description &&
      !shouldRegenerateDescription(business.ai_description_generated_at, 90)
    ) {
      // Return cached description
      return NextResponse.json({
        description: business.ai_description,
        generated_at: business.ai_description_generated_at,
        cached: true,
      })
    }

    // Fetch Google reviews for this business
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('content, rating')
      .eq('business_id', businessId)
      .eq('source', 'google')
      .limit(20)

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
    }

    // Summarize reviews
    const reviewSummary = await summarizeGoogleReviews(reviews || [])

    // Try to scrape website if available
    let websiteContent = null
    if (business.website) {
      websiteContent = await scrapeBusinessWebsite(business.website)
    }

    // Generate description
    const businessInfo = {
      name: business.name,
      category: (business.categories as unknown as { name: string } | null)?.name || undefined,
      city: business.city,
      state: business.state,
      description: business.description,
      shortDescription: business.short_description,
      website: business.website,
      placeId: business.place_id,
    }

    let generatedDescription: string

    if (websiteContent && !websiteContent.error && websiteContent.textContent.length > 200) {
      // Use full generation with website content
      generatedDescription = await generateBusinessDescription(
        businessInfo,
        websiteContent,
        reviewSummary
      )
    } else {
      // Use fallback generation based on reviews only
      generatedDescription = await generateFallbackDescription(
        businessInfo,
        reviewSummary
      )
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        ai_description: generatedDescription,
        ai_description_generated_at: new Date().toISOString(),
        ai_description_source: business.website || 'reviews_only',
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Error saving AI description:', updateError)
      // Still return the generated description even if save failed
    }

    return NextResponse.json({
      description: generatedDescription,
      generated_at: new Date().toISOString(),
      cached: false,
      source: business.website ? 'website_and_reviews' : 'reviews_only',
    })
  } catch (error) {
    console.error('Error generating business description:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { error: 'Failed to generate description', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: businessId } = await params

  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('ai_description, ai_description_generated_at')
      .eq('id', businessId)
      .single()

    if (error || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const isFresh = business.ai_description &&
      !shouldRegenerateDescription(business.ai_description_generated_at, 90)

    return NextResponse.json({
      description: business.ai_description,
      generated_at: business.ai_description_generated_at,
      is_fresh: isFresh,
      needs_regeneration: !isFresh,
    })
  } catch (error) {
    console.error('Error fetching AI description:', error)
    return NextResponse.json(
      { error: 'Failed to fetch description' },
      { status: 500 }
    )
  }
}
