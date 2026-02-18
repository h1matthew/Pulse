import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeForPrompt, scrapeBusinessWebsite } from '@/lib/gemini-business'
import type { DiscountType } from '@/types/business'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ============================================================================
// Types
// ============================================================================

export interface ExtractedDeal {
  title: string
  description: string
  discount_type: DiscountType
  discount_value: number | null
  code: string | null
  end_date: string | null
}

interface ScrapeResult {
  text: string
  error?: string
}

// ============================================================================
// Website Scraping
// ============================================================================

/**
 * Scrape a business website using API Ninjas Web Scraper (text_only mode).
 * Falls back to the built-in scraper if API Ninjas is unavailable.
 */
export async function scrapeWebsiteText(url: string): Promise<ScrapeResult> {
  const apiNinjasKey = process.env.API_NINJAS_KEY || ''

  // Try API Ninjas first
  if (apiNinjasKey) {
    try {
      const apiUrl = `https://api.api-ninjas.com/v1/webscraper?url=${encodeURIComponent(url)}&text_only=true`
      const response = await fetch(apiUrl, {
        headers: { 'X-Api-Key': apiNinjasKey },
      })

      if (response.ok) {
        const data = await response.json()
        const text = (data.data || '').trim()
        if (text.length > 50) {
          return { text: text.slice(0, 8000) }
        }
      }
    } catch (error) {
      console.warn('API Ninjas scraper failed, falling back:', error)
    }
  }

  // Fallback to built-in scraper
  const result = await scrapeBusinessWebsite(url)
  if (result.error || !result.textContent) {
    return { text: '', error: result.error || 'No content extracted' }
  }
  return { text: result.textContent }
}

// ============================================================================
// Gemini Deal Extraction
// ============================================================================

/**
 * Use Gemini AI to extract structured deal data from scraped website text.
 * Returns an empty array if no deals are found.
 */
export async function extractDealsWithGemini(
  businessName: string,
  websiteText: string
): Promise<ExtractedDeal[]> {
  if (!websiteText || websiteText.length < 50) {
    return []
  }

  const sanitizedText = sanitizeForPrompt(websiteText, 4000)
  const sanitizedName = sanitizeForPrompt(businessName, 100)

  const prompt = `You are a deal extraction assistant. Analyze the following website content from "${sanitizedName}" and extract any current deals, offers, coupons, or promotions.

Return a JSON array of deals. Each deal object must have:
- title: string (short, descriptive title, max 80 chars)
- description: string (1-2 sentence description of the offer)
- discount_type: one of "percentage", "fixed_amount", "free_item", "bogo"
- discount_value: number or null (e.g., 20 for 20% off, 5 for $5 off)
- code: string or null (promo code if mentioned)
- end_date: string or null (ISO date like "2026-03-01" if an expiration is mentioned)

Rules:
- Only extract ACTUAL deals/offers/promotions with clear value
- Do NOT invent deals that are not explicitly stated in the text
- Do NOT include regular menu items, service listings, or standard pricing as "deals"
- If no deals are found, return an empty array []
- Maximum 10 deals per business

Website content:
${sanitizedText}

Return ONLY valid JSON array, no markdown, no explanation.`

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    })

    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()

    const parsed = JSON.parse(responseText)

    if (!Array.isArray(parsed)) {
      return []
    }

    // Validate and sanitize each deal
    const validDiscountTypes = new Set(['percentage', 'fixed_amount', 'free_item', 'bogo'])

    return parsed
      .filter((deal: Record<string, unknown>) =>
        deal &&
        typeof deal.title === 'string' &&
        deal.title.length > 0 &&
        typeof deal.description === 'string'
      )
      .slice(0, 10)
      .map((deal: Record<string, unknown>) => ({
        title: String(deal.title).slice(0, 80),
        description: String(deal.description).slice(0, 300),
        discount_type: validDiscountTypes.has(String(deal.discount_type))
          ? (String(deal.discount_type) as DiscountType)
          : 'percentage',
        discount_value: typeof deal.discount_value === 'number' ? deal.discount_value : null,
        code: typeof deal.code === 'string' ? deal.code : null,
        end_date: typeof deal.end_date === 'string' ? deal.end_date : null,
      }))
  } catch (error) {
    console.error('Gemini deal extraction failed:', error)
    return []
  }
}

// ============================================================================
// Database Upsert
// ============================================================================

/**
 * Upsert scraped deals into the database for a given business.
 * Deduplicates by normalized title. Deactivates stale scraped deals.
 * Returns the number of new deals inserted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertScrapedDeals(
  businessId: string,
  deals: ExtractedDeal[],
  supabase: any
): Promise<number> {
  if (deals.length === 0) {
    // Deactivate any old scraped deals for this business
    await (supabase.from('deals') as any)
      .update({ is_active: false })
      .eq('business_id', businessId)
      .eq('source', 'scraped')

    return 0
  }

  // Get existing scraped deals for this business
  const { data: existingDeals } = await (supabase.from('deals') as any)
    .select('id, title')
    .eq('business_id', businessId)
    .eq('source', 'scraped')

  const existingTitles = new Set(
    (existingDeals || []).map((d: { title: string }) =>
      d.title.toLowerCase().trim()
    )
  )

  let newCount = 0

  for (const deal of deals) {
    const normalizedTitle = deal.title.toLowerCase().trim()

    if (existingTitles.has(normalizedTitle)) {
      // Update existing deal
      await (supabase.from('deals') as any)
        .update({
          description: deal.description,
          discount_type: deal.discount_type,
          discount_value: deal.discount_value,
          code: deal.code,
          end_date: deal.end_date,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .eq('source', 'scraped')
        .ilike('title', normalizedTitle)
    } else {
      // Insert new deal
      await (supabase.from('deals') as any)
        .insert({
          business_id: businessId,
          title: deal.title,
          description: deal.description,
          deal_type: 'standard',
          discount_type: deal.discount_type,
          discount_value: deal.discount_value,
          code: deal.code,
          end_date: deal.end_date,
          is_active: true,
          source: 'scraped',
        })

      newCount++
    }
  }

  // Deactivate scraped deals that no longer appear on the website
  const currentTitles = deals.map(d => d.title.toLowerCase().trim())
  const staleDealIds = (existingDeals || [])
    .filter((d: { id: string; title: string }) =>
      !currentTitles.includes(d.title.toLowerCase().trim())
    )
    .map((d: { id: string }) => d.id)

  if (staleDealIds.length > 0) {
    await (supabase.from('deals') as any)
      .update({ is_active: false })
      .in('id', staleDealIds)
  }

  return newCount
}
