import { GoogleGenerativeAI } from '@google/generative-ai'
import { sanitizeForPrompt } from '@/lib/gemini-business'
import { createClient } from '@/lib/supabase/server'
import { isOpenNow } from '@/lib/business/hours'

export interface StreamChunk {
  type: 'chunk' | 'suggestions'
  data: string | string[]
}

/**
 * Resolve the Gemini API key. Falls back to the Google Places key — both are
 * Google Cloud API keys, and the Places project may have the Generative
 * Language API enabled when the primary Gemini key is expired or missing.
 */
function resolveApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_PLACES_API_KEY || ''
}

/**
 * Lazily construct the Gemini client so a missing or expired key never
 * crashes module imports. An empty key fails at request time instead, which
 * callers handle by falling back to generateFallbackResponse.
 */
function getGenAI(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(resolveApiKey())
}

const PULSE_SYSTEM_PROMPT = `You are the Pulse AI Assistant — a friendly, knowledgeable guide for a local business discovery platform called Pulse.

## What Pulse Does
Pulse helps users discover and support small, local businesses. Users can:
- Browse and search for local businesses by category, rating, or distance
- Leave reviews and ratings for businesses they visit
- Bookmark favorite businesses
- Claim special deals and coupons from local businesses
- Complete "Boost Missions" (challenges like "Try 3 new coffee shops this month")
- Track their economic impact on the local community through a personal dashboard

## Product Knowledge (answer feature questions from this, with the page links)
- **Discover** ([/discover](/discover)): real nearby businesses from Google Places with photos and ratings; filters for category, Independent-only, Open now, price ($–$$$$), and 4.0+ rating.
- **Bookmarks** ([/bookmarks](/bookmarks)): tap the heart/bookmark icon on any business. Signed-in users sync to their account; signed-out users save on their device until they sign in.
- **Deals** ([/deals](/deals)): claim an offer to get a unique redemption code, then show the code at the business. Claiming is free — Pulse has no payments.
- **Boost Missions** ([/missions](/missions)): challenges like "Try 3 new coffee shops this month"; progress fills as you check in, and finishing unlocks perks.
- **Impact Dashboard** ([/dashboard](/dashboard)): estimates dollars kept local, businesses supported, and jobs touched from check-ins, reviews, and claimed deals. Key fact: roughly $68 of every $100 spent locally stays in the community, versus about $43 at a chain.
- **Categories** ([/categories](/categories)): the directory organized by what each place does, with live counts.
- Questions like "what is Pulse?", "how do missions work?", or "why shop local?" should be answered from this knowledge — short and concrete, never with a list of unrelated businesses.

## Your Role
You help users with:
1. **Business Recommendations** — Recommend specific local businesses from the Local Business Directory section below when one is provided
2. **Feature Explanations** — Explain how Pulse features work (bookmarks, deals, missions, impact tracking)
3. **Impact Education** — Explain why supporting local businesses matters (local multiplier effect, job creation, community investment)
4. **General Guidance** — Help users navigate the platform and get the most out of Pulse

## Response Format (strict)
- Keep replies SHORT: at most ~60 words. One brief lead-in sentence, then the content. No filler, no restating the question.
- Format with Markdown. When recommending businesses, use a compact bullet list, one line per pick, at most 3 picks:
  - **Business Name** — 4.8★ (212 reviews) · 0.3 mi
- Bold business names. Use "·" separators. Do not use headings or long paragraphs.
- For impact/economics questions you may include one short LaTeX formula delimited by $$ on both sides, e.g. $$\\$100 \\times 0.68 = \\$68 \\text{ stays local}$$ — never use single-$ math delimiters (plain money amounts like $100 must stay plain text).

## Guidelines
- Focus on local business discovery — redirect off-topic questions politely
- When recommending businesses, use ONLY businesses listed in the Local Business Directory section — cite their real ratings, review counts, and distances exactly as listed
- Prefer highlighting independent local businesses over chains when both fit the request (that's Pulse's mission)
- If the directory has no good match for the request, say so honestly and point the user to the Discover page (/discover)
- End with one short actionable pointer (e.g., "More on the Discover page.")
- Never make up business names, addresses, phone numbers, ratings, or any details not present in the directory`

interface AssistantOptions {
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  userContext?: {
    userId?: string
    location?: { lat: number; lng: number }
  }
}

// ============================================================================
// RAG: ground every answer in real businesses from the Pulse directory
// ============================================================================

export interface RetrievedBusiness {
  name: string
  category: string | null
  rating: number | null
  reviewCount: number
  city: string | null
  priceRange: number | null
  isChain: boolean | null
  distanceMiles: number | null
  openNow: boolean | null
}

interface RetrievedBusinessRow {
  name: string
  average_rating: number | string | null
  review_count: number | null
  city: string | null
  price_range: number | null
  is_chain: boolean | null
  hours: unknown
  latitude: number | string | null
  longitude: number | string | null
  categories: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null
}

function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 3958.8 // Earth radius in miles
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Retrieve the businesses most relevant to the user's message from Supabase.
 * Pulls the top-rated pool (optionally narrowed by detected category intent),
 * then ranks by distance when the user's location is known. Fail-safe: any
 * error returns [] so the assistant degrades to ungrounded guidance instead
 * of crashing the request.
 */
export async function retrieveBusinessContext(
  message: string,
  location?: { lat: number; lng: number },
  limit = 12
): Promise<RetrievedBusiness[]> {
  try {
    const supabase = await createClient()
    const categorySlug = detectCategorySlug(message)

    const baseSelect =
      'name, average_rating, review_count, city, price_range, is_chain, hours, latitude, longitude'

    let query = supabase
      .from('businesses')
      .select(
        categorySlug
          ? `${baseSelect}, categories!inner(name, slug)`
          : `${baseSelect}, categories(name, slug)`
      )
      .gt('average_rating', 0)

    if (categorySlug) {
      query = query.eq('categories.slug', categorySlug)
    }

    const { data, error } = await query
      .order('average_rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(40)

    if (error || !data || data.length === 0) return []

    const rows = data as unknown as RetrievedBusinessRow[]
    const mapped: RetrievedBusiness[] = rows
      .filter((row) => typeof row.name === 'string' && row.name.length > 0)
      .map((row) => {
        const category = Array.isArray(row.categories)
          ? row.categories[0]?.name ?? null
          : row.categories?.name ?? null

        const lat = row.latitude == null ? null : Number(row.latitude)
        const lng = row.longitude == null ? null : Number(row.longitude)
        const hasCoords =
          lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)

        let distanceMiles: number | null = null
        if (location && hasCoords) {
          distanceMiles = haversineMiles(location, { lat: lat as number, lng: lng as number })
        }

        const rating = row.average_rating == null ? null : Number(row.average_rating)

        return {
          name: row.name,
          category,
          rating: rating != null && Number.isFinite(rating) ? rating : null,
          reviewCount: row.review_count ?? 0,
          city: row.city ?? null,
          priceRange: row.price_range ?? null,
          isChain: row.is_chain ?? null,
          distanceMiles,
          openNow: isOpenNow(row.hours),
        }
      })

    // Rank by quality first, discounted by distance (when known) and by chain
    // status — a 4.8-star independent a mile away should beat the 2.8-star
    // chain next door. Unknown coordinates rank as if moderately far.
    const score = (b: RetrievedBusiness) => {
      const rating = b.rating ?? 0
      const distance = location ? (b.distanceMiles ?? 7.5) : 0
      const chainPenalty = b.isChain === true ? 0.7 : 0
      return rating - 0.4 * distance - chainPenalty
    }
    mapped.sort((a, b) => score(b) - score(a))

    return mapped.slice(0, limit)
  } catch {
    return []
  }
}

/** Render retrieved businesses as compact directory lines for the LLM prompt. */
export function formatDirectoryContext(businesses: RetrievedBusiness[]): string {
  return businesses
    .map((b) => {
      const parts = [b.name]
      if (b.category) parts.push(b.category)
      if (b.rating != null) {
        const reviewLabel = b.reviewCount === 1 ? 'review' : 'reviews'
        parts.push(`${b.rating.toFixed(1)} stars (${b.reviewCount} ${reviewLabel})`)
      }
      if (b.city) parts.push(b.city)
      if (b.priceRange != null) parts.push('$'.repeat(Math.min(Math.max(b.priceRange, 1), 4)))
      if (b.distanceMiles != null) parts.push(`${b.distanceMiles.toFixed(1)} mi away`)
      if (b.openNow === true) parts.push('Open now')
      parts.push(b.isChain === true ? 'Chain' : 'Independent')
      return `- ${parts.join(' | ')}`
    })
    .join('\n')
}

/**
 * Build the full grounded system prompt: base persona + the real business
 * directory retrieved for this message (or honest fallback instructions when
 * retrieval came up empty).
 */
async function buildGroundedSystemPrompt(
  message: string,
  userContext?: AssistantOptions['userContext']
): Promise<string> {
  const retrieved = await retrieveBusinessContext(message, userContext?.location)

  if (retrieved.length === 0) {
    return `${PULSE_SYSTEM_PROMPT}

## Local Business Directory
(The directory is unavailable for this request. Recommend categories or types of businesses instead — do NOT name specific businesses — and point the user to the Discover page (/discover).)`
  }

  const locationNote = userContext?.location
    ? ' Distances are measured from the user\'s current location, so these are genuinely nearby.'
    : ''

  return `${PULSE_SYSTEM_PROMPT}

## Local Business Directory
These are real businesses from the Pulse directory, pre-sorted by relevance for this user.${locationNote} Recommend only from this list:
${formatDirectoryContext(retrieved)}`
}

/**
 * Check if a message matches a quick-response pattern.
 * Returns a canned response for greetings, thanks, and help requests,
 * or null if the message needs full AI processing.
 */
export function getQuickResponse(message: string): string | null {
  const lower = message.toLowerCase().trim()

  // Greetings
  if (/^(hi|hello|hey|howdy|yo|sup|what'?s up|hiya)\b/.test(lower)) {
    return "Hey there! Welcome to Pulse — your guide to discovering amazing local businesses. I can help you find great spots nearby, explain how your support impacts the local economy, or walk you through any of Pulse's features. What would you like to explore?"
  }

  // Thanks
  if (/^(thanks|thank you|thx|ty|cheers|appreciated)\b/.test(lower)) {
    return "You're welcome! Happy to help. If you have more questions about local businesses or Pulse features, just ask. Keep supporting local — every visit makes a difference!"
  }

  // Goodbye
  if (/^(bye|goodbye|see ya|later|cya|peace)\b/.test(lower)) {
    return "See you later! Remember, every time you visit a local business, you're making a real impact on your community. Happy exploring!"
  }

  // Help
  if (lower === 'help' || lower === '?' || lower === 'what can you do') {
    return "I'm the Pulse AI Assistant! Here's what I can help with:\n\n- **Find businesses** — Tell me what you're looking for (coffee, restaurants, shops, etc.)\n- **Explain features** — Ask about bookmarks, deals, missions, or impact tracking\n- **Impact info** — Learn how supporting local businesses helps your community\n- **Get started** — I'll walk you through how to use Pulse\n\nWhat sounds interesting?"
  }

  // About Pulse — answer product questions directly (and instantly)
  if (/\b(about pulse|what(?:'s| is) pulse|what does pulse do|how does pulse work|tell me about (?:pulse|this app|this site))\b/.test(lower)) {
    return "**Pulse** helps you discover and support local businesses — and see the impact of doing it.\n\n- **Discover** real nearby businesses with photos, ratings, and filters\n- **Save** bookmarks, claim **deals**, and take on **Boost Missions**\n- **Track your impact** — how much of your spending stays in the community\n\nStart on the [Discover page](/discover)."
  }

  return null
}

/**
 * Generate a full AI response using Google Gemini.
 * Handles multi-turn conversations and location context.
 */
export async function generateAssistantResponse(
  message: string,
  options: AssistantOptions = {}
): Promise<{ text: string; suggestions?: string[] }> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  const sanitizedMessage = sanitizeForPrompt(message, 2000)
  const { history = [], userContext } = options
  const systemPrompt = await buildGroundedSystemPrompt(message, userContext)

  let contextNote = ''
  if (userContext?.location) {
    contextNote = `\n\nNote: The user has shared their location (lat: ${userContext.location.lat}, lng: ${userContext.location.lng}). You can acknowledge they're searching locally but don't reveal exact coordinates.`
  }

  if (history.length > 0) {
    const sanitizedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.role === 'user' ? sanitizeForPrompt(msg.content, 1000) : msg.content }],
    }))

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `[System context: ${systemPrompt}${contextNote}]\n\nI have a question about local businesses.` }],
        },
        {
          role: 'model',
          parts: [{ text: "Of course! I'd love to help you discover great local businesses. What are you looking for?" }],
        },
        ...sanitizedHistory,
      ],
    })

    const result = await chat.sendMessage(sanitizedMessage)
    const text = result.response.text()

    return {
      text,
      suggestions: extractSuggestions(text),
    }
  }

  const prompt = `${systemPrompt}${contextNote}

## Additional Instructions
After your main response, include exactly 3 follow-up questions the user might want to ask. Format them at the very end like this:
<suggestions>
["First question?", "Second question?", "Third question?"]
</suggestions>

## User's Message
${sanitizedMessage}`

  const result = await model.generateContent(prompt)
  const fullText = result.response.text()

  // Strip the suggestions tag from the visible text
  const cleanText = fullText.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim()
  const suggestions = extractSuggestions(fullText)

  return {
    text: cleanText,
    suggestions,
  }
}

/**
 * Streaming version of generateAssistantResponse.
 * Yields text chunks in real-time, then follow-up suggestions at the end.
 */
export async function* generateAssistantResponseStream(
  message: string,
  options: AssistantOptions = {}
): AsyncGenerator<StreamChunk> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  const sanitizedMessage = sanitizeForPrompt(message, 2000)
  const { history = [], userContext } = options
  const systemPrompt = await buildGroundedSystemPrompt(message, userContext)

  let contextNote = ''
  if (userContext?.location) {
    contextNote = `\n\nNote: The user has shared their location (lat: ${userContext.location.lat}, lng: ${userContext.location.lng}). You can acknowledge they're searching locally but don't reveal exact coordinates.`
  }

  let fullResponse = ''

  if (history.length > 0) {
    const sanitizedHistory = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.role === 'user' ? sanitizeForPrompt(msg.content, 1000) : msg.content }],
    }))

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `[System context: ${systemPrompt}${contextNote}]\n\nI have a question about local businesses.` }],
        },
        {
          role: 'model',
          parts: [{ text: "Of course! I'd love to help you discover great local businesses. What are you looking for?" }],
        },
        ...sanitizedHistory,
      ],
    })

    const result = await chat.sendMessageStream(sanitizedMessage)
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        fullResponse += chunkText
        yield { type: 'chunk', data: chunkText }
      }
    }
  } else {
    const prompt = `${systemPrompt}${contextNote}

## Additional Instructions
After your main response, include exactly 3 follow-up questions the user might want to ask. Format them at the very end like this:
<suggestions>
["First question?", "Second question?", "Third question?"]
</suggestions>

## User's Message
${sanitizedMessage}`

    const result = await model.generateContentStream(prompt)
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        fullResponse += chunkText
        yield { type: 'chunk', data: chunkText }
      }
    }
  }

  // Extract and yield suggestions from the accumulated response
  const suggestions = extractSuggestions(fullResponse)
  if (suggestions.length > 0) {
    yield { type: 'suggestions', data: suggestions }
  }
}

export interface FallbackResponse {
  text: string
  suggestions?: string[]
  degraded: true
}

interface FallbackOptions {
  location?: { lat: number; lng: number }
}

/** Keyword → category slug maps, checked in order; first match wins. */
const CATEGORY_KEYWORDS: Array<{ slug: string; keywords: string[] }> = [
  { slug: 'food-drink', keywords: ['food', 'eat', 'restaurant', 'dinner', 'lunch', 'coffee', 'cafe'] },
  { slug: 'retail', keywords: ['shop', 'store', 'retail', 'gift'] },
  { slug: 'health-wellness', keywords: ['gym', 'spa', 'health', 'dentist', 'doctor'] },
  { slug: 'services', keywords: ['salon', 'repair', 'bank', 'service'] },
  { slug: 'entertainment', keywords: ['movie', 'fun', 'arcade', 'entertainment', 'bowling'] },
  { slug: 'arts-culture', keywords: ['art', 'museum', 'gallery', 'library'] },
]

/**
 * Map a free-text message to a business category slug using simple keyword
 * matching (whole words, optional plural "s"). Returns null when no category
 * intent is detected.
 */
export function detectCategorySlug(message: string): string | null {
  const lower = message.toLowerCase()

  for (const { slug, keywords } of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (new RegExp(`\\b${keyword}s?\\b`).test(lower)) {
        return slug
      }
    }
  }

  return null
}

const FALLBACK_SUGGESTIONS = [
  'What are Boost Missions?',
  'How does supporting local help my community?',
  'Find me a top-rated coffee shop',
]

const GENERIC_FALLBACK_TEXT =
  "I couldn't pull up specific recommendations right now, but the [Discover page](/discover) lets you browse top-rated local businesses by category, rating, and distance. Give it a look!"

/**
 * Curated answers for product/impact questions. Without these, the fallback
 * (and any non-discovery question while the LLM is down) would answer
 * "Tell me about Pulse" with a list of dental studios — accurate copy beats
 * an off-topic business list.
 */
const TOPIC_ANSWERS: Array<{
  pattern: RegExp
  text: string
  suggestions: string[]
}> = [
  {
    pattern: /\b(boost mission|missions?)\b/i,
    text:
      '**Boost Missions** are local challenges — like *"Try 3 new coffee shops this month."*\n\n- Track progress as you check in at businesses\n- Finish missions to unlock perks\n\nSee what\'s active on the [Missions page](/missions).',
    suggestions: ['Find me a top-rated coffee shop', 'How do deals work?', 'How does my impact get tracked?'],
  },
  {
    pattern: /\b(bookmarks?|sav(e|ing) (a |my )?(business|place|spot))\b/i,
    text:
      '**Bookmarks** save businesses you want to remember.\n\n- Tap the heart or bookmark icon on any business\n- Signed in: synced to your account\n- Signed out: kept on this device until you sign in\n\nFind them on your [Bookmarks page](/bookmarks).',
    suggestions: ['Find me a top-rated coffee shop', 'What are Boost Missions?', 'Tell me about Pulse'],
  },
  {
    pattern: /\b(deals?|coupons?|discounts?|claim(ing)?)\b/i,
    text:
      '**Deals** are offers from local businesses.\n\n- Browse current offers on the [Deals page](/deals)\n- Claim one to get a unique redemption code\n- Show the code at the business to redeem\n\nNo payments in the app — claiming is free.',
    suggestions: ['What are Boost Missions?', 'Find me dinner nearby', 'How does supporting local help?'],
  },
  {
    pattern: /\b(impact|local economy|multiplier|support(ing)? local|shop(ping)? local|buy(ing)? local|dollars? kept)\b/i,
    text:
      'Spending locally keeps money in your community — roughly **$68 of every $100** stays local versus about **$43** at a chain.\n\nPulse estimates your personal impact (dollars kept local, businesses supported, jobs touched) from your check-ins, reviews, and claimed deals — see your [Dashboard](/dashboard).',
    suggestions: ['Find me a top-rated independent spot', 'What are Boost Missions?', 'Tell me about Pulse'],
  },
]

/** Discovery-style asks: only these should produce a business list. */
const DISCOVERY_PATTERN =
  /\b(find|near(?:by| me)?|recommend|suggest|best|top[- ]rated|popular|around (?:here|me|town)|what'?s good|where (?:can|should|is)|open now|spots?|places?|hungry)\b/i

/**
 * Database-backed fallback used when the Gemini API is unavailable (expired
 * key, quota, outage). Routes by intent: product/impact questions get
 * curated answers; discovery questions get real top-rated businesses
 * (shared retrieveBusinessContext — category-narrowed, distance-ranked).
 */
export async function generateFallbackResponse(
  message: string,
  opts: FallbackOptions = {}
): Promise<FallbackResponse> {
  const nearYou = opts.location ? ' near you' : ''

  // Product/feature/impact questions → curated copy, not a business list.
  // Category intent (e.g. "find a good restaurant") outranks topic matches
  // ("restaurant" isn't a topic), but "how do deals work" must not return
  // restaurants — so topics win unless the message clearly asks to discover.
  const categorySlug = detectCategorySlug(message)
  const topic = TOPIC_ANSWERS.find((t) => t.pattern.test(message))
  if (topic && !categorySlug) {
    return { text: topic.text, suggestions: topic.suggestions, degraded: true }
  }

  // Not a discovery-style question either → honest generic guidance.
  if (!categorySlug && !DISCOVERY_PATTERN.test(message)) {
    return {
      text: GENERIC_FALLBACK_TEXT,
      suggestions: FALLBACK_SUGGESTIONS,
      degraded: true,
    }
  }

  const businesses = await retrieveBusinessContext(message, opts.location, 5)

  if (businesses.length === 0) {
    return {
      text: GENERIC_FALLBACK_TEXT,
      suggestions: FALLBACK_SUGGESTIONS,
      degraded: true,
    }
  }

  const lines = businesses.slice(0, 3).map((business) => {
    const rating = business.rating != null ? `${business.rating.toFixed(1)}★` : 'New'
    const reviewLabel = business.reviewCount === 1 ? 'review' : 'reviews'
    const parts = [`**${business.name}** — ${rating} (${business.reviewCount} ${reviewLabel})`]
    if (business.distanceMiles != null) parts.push(`${business.distanceMiles.toFixed(1)} mi`)
    else if (business.city) parts.push(business.city)
    return `- ${parts.join(' · ')}`
  })

  const text = [
    `Top-rated local spots${nearYou}:`,
    '',
    ...lines,
    '',
    'More on the [Discover page](/discover).',
  ].join('\n')

  return {
    text,
    suggestions: FALLBACK_SUGGESTIONS,
    degraded: true,
  }
}

/**
 * Extract follow-up suggestions from a response that contains a <suggestions> tag.
 */
function extractSuggestions(text: string): string[] {
  const match = text.match(/<suggestions>\s*\[([\s\S]*?)\]\s*<\/suggestions>/)
  if (!match) return []

  try {
    const parsed = JSON.parse(`[${match[1]}]`)
    if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string')
  } catch {
    // Fallback: extract quoted strings
    const quoted = match[1].match(/"([^"]+)"/g)
    if (quoted) return quoted.map((s) => s.slice(1, -1))
  }

  return []
}
