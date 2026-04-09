/**
 * Gemini AI Business Description Generator
 *
 * Uses Google Gemini to produce engaging, localized business descriptions
 * from structured data (name, category, reviews, scraped website content).
 *
 * DESIGN RATIONALE: Many businesses synced from Google Places have sparse or
 * no descriptions. Gemini fills this gap by synthesizing a natural-language
 * summary from available signals, giving every listing a polished feel.
 *
 * SAFETY: All user-controlled inputs are sanitized via `sanitizeForPrompt()`
 * before being embedded in the AI prompt to defend against prompt injection.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * Sanitize user input for safe inclusion in AI prompts.
 */
export function sanitizeForPrompt(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return ''

  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/^#{1,6}\s/gm, '\\# ')
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|context)/gi, '[filtered]')
    .replace(/disregard\s+(all\s+)?(previous|above|prior)/gi, '[filtered]')
    .replace(/new\s+instructions?:/gi, '[filtered]:')
    .trim()
}

export interface BusinessInfo {
  name: string
  category?: string
  city: string
  state: string
  description?: string | null
  shortDescription?: string | null
  website?: string | null
  placeId?: string | null
}

export interface ReviewSummary {
  averageRating: number
  totalReviews: number
  topPositiveThemes: string[]
  topNegativeThemes: string[]
  sampleReviews: string[]
}

export interface ScrapedContent {
  url: string
  title: string
  description: string
  textContent: string
  error?: string
}

/**
 * Scrape a business website and extract text content
 * Uses a simple fetch-based approach with timeout
 */
export async function scrapeBusinessWebsite(url: string): Promise<ScrapedContent> {
  try {
    // Validate URL
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        url,
        title: '',
        description: '',
        textContent: '',
        error: 'Invalid URL protocol',
      }
    }

    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PulseBot/1.0; +https://pulse.local)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        url,
        title: '',
        description: '',
        textContent: '',
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || ''

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i)
    const description = metaDescMatch?.[1]?.trim() || ''

    // Extract text content (simple approach - remove script/style tags and get text)
    let textContent = html
      // Remove script and style tags and their content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
      // Remove common non-content elements
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
      // Convert tags to spaces
      .replace(/<[^>]+>/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Limit content length
    if (textContent.length > 8000) {
      textContent = textContent.slice(0, 8000) + '...'
    }

    return {
      url,
      title,
      description,
      textContent,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      url,
      title: '',
      description: '',
      textContent: '',
      error: errorMessage,
    }
  }
}

/**
 * Summarize Google reviews to extract key themes
 */
export async function summarizeGoogleReviews(
  reviews: Array<{ content: string; rating: number }>
): Promise<ReviewSummary> {
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      topPositiveThemes: [],
      topNegativeThemes: [],
      sampleReviews: [],
    }
  }

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  // Get sample of reviews (mix of high and medium ratings)
  const sortedReviews = [...reviews].sort((a, b) => b.rating - a.rating)
  const sampleReviews = sortedReviews
    .filter(r => r.content && r.content.length > 20)
    .slice(0, 5)
    .map(r => r.content.slice(0, 300))

  // Simple keyword extraction for themes (could be enhanced with AI)
  const positiveWords = ['great', 'excellent', 'amazing', 'love', 'best', 'friendly', 'clean', 'delicious', 'recommend', 'good', 'nice', 'wonderful', 'perfect', 'awesome']
  const negativeWords = ['bad', 'terrible', 'worst', 'hate', 'dirty', 'rude', 'slow', 'expensive', 'poor', 'disappointing', 'awful', 'never']

  const positiveThemes = new Map<string, number>()
  const negativeThemes = new Map<string, number>()

  for (const review of reviews) {
    const content = review.content.toLowerCase()
    const words = content.split(/\s+/)

    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '')
      if (positiveWords.includes(cleanWord) && review.rating >= 4) {
        positiveThemes.set(cleanWord, (positiveThemes.get(cleanWord) || 0) + 1)
      }
      if (negativeWords.includes(cleanWord) && review.rating <= 2) {
        negativeThemes.set(cleanWord, (negativeThemes.get(cleanWord) || 0) + 1)
      }
    }
  }

  const topPositiveThemes = Array.from(positiveThemes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  const topNegativeThemes = Array.from(negativeThemes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word)

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length,
    topPositiveThemes,
    topNegativeThemes,
    sampleReviews,
  }
}

/**
 * Generate a business description using Gemini AI
 */
export async function generateBusinessDescription(
  business: BusinessInfo,
  websiteContent: ScrapedContent | null,
  reviewSummary: ReviewSummary
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const sanitizedName = sanitizeForPrompt(business.name, 200)
  const sanitizedCategory = sanitizeForPrompt(business.category || 'local business', 100)
  const sanitizedCity = sanitizeForPrompt(business.city, 100)
  const sanitizedState = sanitizeForPrompt(business.state, 100)
  const existingDesc = sanitizeForPrompt(business.description || business.shortDescription || '', 1000)

  let websiteSection = ''
  if (websiteContent && !websiteContent.error) {
    const title = sanitizeForPrompt(websiteContent.title, 200)
    const desc = sanitizeForPrompt(websiteContent.description, 500)
    const content = sanitizeForPrompt(websiteContent.textContent, 4000)
    websiteSection = `
Website Information:
- Title: ${title}
- Meta Description: ${desc}
- Content Summary: ${content.slice(0, 2000)}
`
  }

  let reviewsSection = ''
  if (reviewSummary.totalReviews > 0) {
    const sampleReviewsText = reviewSummary.sampleReviews
      .map((r, i) => `${i + 1}. "${sanitizeForPrompt(r, 300)}"`)
      .join('\n')

    reviewsSection = `
Customer Reviews Summary:
- Average Rating: ${reviewSummary.averageRating}/5 (${reviewSummary.totalReviews} reviews)
- Common Positive Feedback: ${reviewSummary.topPositiveThemes.join(', ') || 'N/A'}
${reviewSummary.topNegativeThemes.length > 0 ? `- Areas for Improvement: ${reviewSummary.topNegativeThemes.join(', ')}` : ''}
- Sample Reviews:
${sampleReviewsText}
`
  }

  const prompt = `Write an engaging "About" section for a local business directory.

Business Name: ${sanitizedName}
Category: ${sanitizedCategory}
Location: ${sanitizedCity}, ${sanitizedState}
${existingDesc ? `Current Description: ${existingDesc}` : ''}
${websiteSection}
${reviewsSection}

Write 2-4 paragraphs that describe what makes this business special. Focus on:
1. The overall vibe and atmosphere (based on reviews and website)
2. What customers love most about it
3. Signature products, services, or experiences
4. Why someone should visit

Guidelines:
- Be factual and authentic - don't invent specific details not in the source material
- Use an inviting, helpful tone suitable for a business directory
- If information is limited, write a general but appealing description
- Highlight what makes this place unique based on customer feedback
- Keep it under 300 words
- Do NOT include generic phrases like "Check out their website for more information"

Return ONLY the description text, no markdown formatting, no "Here's the description:" prefix.`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  // Clean up the response
  return text
    .replace(/^(Here is|Here's|Here are|Below is|Description:)\s*(the\s+)?(description|about section|write-up)[:\s]*/i, '')
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .trim()
}

/**
 * Generate a quick summary if website scraping fails or limited data
 */
export async function generateFallbackDescription(
  business: BusinessInfo,
  reviewSummary: ReviewSummary
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

  const sanitizedName = sanitizeForPrompt(business.name, 200)
  const sanitizedCategory = sanitizeForPrompt(business.category || 'local business', 100)
  const sanitizedCity = sanitizeForPrompt(business.city, 100)

  let reviewsSection = ''
  if (reviewSummary.totalReviews > 0) {
    reviewsSection = `
Customer Feedback:
- Rating: ${reviewSummary.averageRating}/5 from ${reviewSummary.totalReviews} reviews
- What customers mention: ${reviewSummary.topPositiveThemes.slice(0, 3).join(', ') || 'various aspects'}
- Sample: "${sanitizeForPrompt(reviewSummary.sampleReviews[0] || '', 200)}"
`
  }

  const prompt = `Write a brief, inviting description for a local business.

Business: ${sanitizedName}
Type: ${sanitizedCategory}
Location: ${sanitizedCity}
${reviewsSection}

Write 2 paragraphs describing what this ${sanitizedCategory} offers and why locals and visitors should check it out. Keep it under 200 words and focus on creating an appealing, authentic impression.

Return ONLY the description text.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

/**
 * Check if an AI description needs regeneration
 */
export function shouldRegenerateDescription(
  generatedAt: string | null | undefined,
  maxAgeDays: number = 90
): boolean {
  if (!generatedAt) return true

  const generated = new Date(generatedAt)
  const now = new Date()
  const diffMs = now.getTime() - generated.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  return diffDays > maxAgeDays
}
