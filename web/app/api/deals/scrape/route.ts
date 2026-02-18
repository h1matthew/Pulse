import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { scrapeWebsiteText, extractDealsWithGemini, upsertScrapedDeals } from '@/lib/deal-scraper'

/**
 * POST /api/deals/scrape
 *
 * Scrapes business websites to discover real deals using API Ninjas + Gemini AI.
 * Optionally accepts ?businessId= to scrape a single business.
 * Without businessId, scrapes up to 10 businesses that haven't been checked in 24h.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')

  try {
    // Build query for businesses to scrape
    let query = supabase
      .from('businesses')
      .select('id, name, website, deals_last_scraped_at')
      .not('website', 'is', null)

    if (businessId) {
      query = query.eq('id', businessId)
    } else {
      // Only scrape businesses not checked in last 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.or(`deals_last_scraped_at.is.null,deals_last_scraped_at.lt.${cutoff}`)
        .limit(10)
    }

    const { data: businesses, error: queryError } = await query

    if (queryError) {
      console.error('Failed to query businesses:', queryError)
      return NextResponse.json(
        { error: 'Failed to query businesses' },
        { status: 500 }
      )
    }

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({
        scraped: 0,
        dealsFound: 0,
        message: 'No businesses to scrape (all recently checked or no websites on file)',
      })
    }

    let totalScraped = 0
    let totalDealsFound = 0
    const errors: string[] = []

    // Process businesses sequentially to respect rate limits
    for (const business of businesses) {
      if (!business.website) continue

      try {
        // Step 1: Scrape website text
        const scrapeResult = await scrapeWebsiteText(business.website)

        if (scrapeResult.error || !scrapeResult.text) {
          errors.push(`${business.name}: ${scrapeResult.error || 'No content'}`)
          // Still update last scraped timestamp to avoid retrying immediately
          await supabase
            .from('businesses')
            .update({ deals_last_scraped_at: new Date().toISOString() })
            .eq('id', business.id)
          continue
        }

        // Step 2: Extract deals with Gemini
        const deals = await extractDealsWithGemini(business.name, scrapeResult.text)

        // Step 3: Upsert deals to database
        const newDeals = await upsertScrapedDeals(business.id, deals, supabase)

        // Step 4: Update last scraped timestamp
        await supabase
          .from('businesses')
          .update({ deals_last_scraped_at: new Date().toISOString() })
          .eq('id', business.id)

        totalScraped++
        totalDealsFound += newDeals

        // Small delay between businesses to respect rate limits
        if (businesses.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${business.name}: ${message}`)
      }
    }

    return NextResponse.json({
      scraped: totalScraped,
      dealsFound: totalDealsFound,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Deal scraping error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
