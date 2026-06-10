/**
 * Pulse Assistant - RAG (Retrieval Augmented Generation)
 *
 * Retrieves relevant business data from Supabase to provide context
 * for the AI assistant's responses.
 */

import { createClient } from '@/lib/supabase/server'
import { isChainBusiness } from '@/lib/business/classify'
import type { BusinessWithCategory } from '@/types/business'

export interface RAGContext {
  businesses: BusinessWithCategory[]
  categories: { id: string; name: string; slug: string }[]
  totalCount: number
  queryUsed: string
}

export interface UserContext {
  userId?: string
  location?: { lat: number; lng: number }
  city?: string
  bookmarkedBusinessIds?: string[]
}

/**
 * Extract keywords from a user query for better searching
 */
function extractKeywords(query: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if',
    'because', 'although', 'though', 'while', 'where', 'when',
    'that', 'which', 'who', 'whom', 'whose', 'what', 'this',
    'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our',
    'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it',
    'its', 'they', 'them', 'their', 'find', 'me', 'show',
    'get', 'want', 'looking', 'search', 'need', 'recommend',
    'suggest', 'best', 'good', 'great', 'nice', 'some',
  ])

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
}

/**
 * Detect category from query keywords
 */
function detectCategory(query: string): string | null {
  const categoryKeywords: Record<string, string[]> = {
    'food-drink': ['coffee', 'cafe', 'restaurant', 'food', 'eat', 'dining', 'bar', 'drink', 'cafe', 'bakery', 'pizza', 'sushi', 'burger', 'breakfast', 'brunch', 'lunch', 'dinner'],
    'retail': ['shop', 'store', 'buy', 'shopping', 'clothing', 'book', 'gift', 'retail', 'boutique', 'market'],
    'services': ['service', 'repair', 'fix', 'cleaning', 'plumber', 'electrician', 'professional'],
    'health-wellness': ['gym', 'fitness', 'spa', 'salon', 'wellness', 'health', 'yoga', 'massage', 'beauty', 'hair'],
    'arts-culture': ['art', 'gallery', 'museum', 'theater', 'culture', 'bookstore', 'studio', 'creative'],
    'entertainment': ['entertainment', 'fun', 'game', 'arcade', 'bowling', 'movie', 'cinema', 'music', 'venue'],
  }

  const lowerQuery = query.toLowerCase()

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      return category
    }
  }

  return null
}

/**
 * Detect amenity/feature preferences from query
 */
function detectAmenities(query: string): string[] {
  const amenityKeywords: Record<string, string[]> = {
    'wifi': ['wifi', 'wi-fi', 'internet', 'work', 'laptop', 'remote work', 'study'],
    'quiet': ['quiet', 'peaceful', 'calm', 'relaxing', 'cozy', 'intimate'],
    'family-friendly': ['family', 'kid', 'kids', 'children', 'child-friendly', 'family-friendly'],
    'outdoor': ['outdoor', 'patio', 'terrace', 'outside', 'garden', 'alfresco'],
    'romantic': ['romantic', 'date', 'date night', 'anniversary', 'special occasion'],
    'vegan': ['vegan', 'vegetarian', 'plant-based', 'meat-free'],
    'pet-friendly': ['pet', 'dog', 'puppy', 'pet-friendly', 'dog-friendly'],
    'accessible': ['accessible', 'wheelchair', 'disability', 'mobility'],
  }

  const lowerQuery = query.toLowerCase()
  const detected: string[] = []

  for (const [amenity, keywords] of Object.entries(amenityKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      detected.push(amenity)
    }
  }

  return detected
}

/**
 * Retrieve relevant businesses based on the user's query
 */
export async function retrieveBusinesses(
  query: string,
  userContext?: UserContext,
  limit: number = 10
): Promise<RAGContext> {
  const supabase = await createClient()

  // Extract search terms and preferences
  const keywords = extractKeywords(query)
  const detectedCategory = detectCategory(query)
  const amenities = detectAmenities(query)

  // Start building the query
  let dbQuery = supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_verified', true)
    .order('average_rating', { ascending: false })
    .limit(limit)

  // Apply category filter if detected
  if (detectedCategory) {
    const { data: categoryData } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', detectedCategory)
      .single()

    if (categoryData) {
      dbQuery = dbQuery.eq('category_id', categoryData.id)
    }
  }

  // Apply location filter if user location is available
  if (userContext?.location) {
    // Note: This is a simplified distance calculation
    // For production, use PostGIS ST_DWithin
    const { lat, lng } = userContext.location
    const latRange = 0.5 // Roughly 35 miles
    const lngRange = 0.5

    dbQuery = dbQuery
      .gte('latitude', lat - latRange)
      .lte('latitude', lat + latRange)
      .gte('longitude', lng - lngRange)
      .lte('longitude', lng + lngRange)
  }

  // Execute the query
  const { data: businesses, error } = await dbQuery

  if (error) {
    console.error('RAG retrieval error:', error)
    return {
      businesses: [],
      categories: [],
      totalCount: 0,
      queryUsed: query,
    }
  }

  // Fetch all categories for context
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)

  // Only recommend independent small businesses — never chains/franchises
  let filteredBusinesses = (businesses || []).filter(
    (business) =>
      business.is_chain !== true &&
      (business.is_chain === false || !isChainBusiness({ name: business.name }))
  )

  if (keywords.length > 0 && filteredBusinesses.length > 0) {
    // Score each business by keyword match
    const scored = filteredBusinesses.map(business => {
      let score = 0
      const searchText = `${business.name} ${business.description || ''} ${business.short_description || ''} ${(business.tags || []).join(' ')}`.toLowerCase()

      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          score += 1
          // Boost for name matches
          if (business.name.toLowerCase().includes(keyword)) {
            score += 2
          }
        }
      }

      return { business, score }
    })

    // Sort by score and take top results
    scored.sort((a, b) => b.score - a.score)
    filteredBusinesses = scored
      .filter(item => item.score > 0)
      .map(item => item.business)
      .slice(0, limit)
  }

  return {
    businesses: filteredBusinesses as BusinessWithCategory[],
    categories: categories || [],
    totalCount: filteredBusinesses.length,
    queryUsed: query,
  }
}

/**
 * Retrieve a specific business by name or ID
 */
export async function retrieveSpecificBusiness(
  identifier: string
): Promise<BusinessWithCategory | null> {
  const supabase = await createClient()

  // Try to find by ID first
  const { data: byId } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', identifier)
    .single()

  if (byId) return byId as BusinessWithCategory

  // Try to find by slug
  const { data: bySlug } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('slug', identifier)
    .single()

  if (bySlug) return bySlug as BusinessWithCategory

  // Try to find by name (case-insensitive partial match)
  const { data: byName } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .ilike('name', `%${identifier}%`)
    .limit(1)
    .single()

  return (byName as BusinessWithCategory) || null
}

/**
 * Retrieve user's personal impact data
 */
export async function retrieveUserImpact(userId: string): Promise<{
  estimatedDollarsKeptLocal: number
  businessesSupported: number
  reviewsLeft: number
  totalCheckIns: number
  missionsCompleted: number
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_impact')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  return {
    estimatedDollarsKeptLocal: Number(data.estimated_dollars_kept_local) || 0,
    businessesSupported: data.businesses_supported || 0,
    reviewsLeft: data.reviews_left || 0,
    totalCheckIns: data.total_check_ins || 0,
    missionsCompleted: data.missions_completed || 0,
  }
}

/**
 * Format business data for inclusion in AI prompt
 */
export function formatBusinessContext(ragContext: RAGContext): string {
  if (ragContext.businesses.length === 0) {
    return 'No specific businesses match this query in our database currently. Provide general advice about finding such businesses locally.'
  }

  return ragContext.businesses
    .map((b, index) => {
      const parts = [
        `${index + 1}. **${b.name}**`,
        b.category?.name ? `(${b.category.name})` : '',
        b.short_description || b.description || '',
        b.address ? `📍 ${b.address}` : '',
        b.average_rating ? `⭐ ${b.average_rating}/5 (${b.review_count} reviews)` : '',
        b.price_range ? `💰 ${'$'.repeat(b.price_range)}` : '',
        (b.tags || []).length > 0 ? `🏷️ ${(b.tags as string[]).slice(0, 5).join(', ')}` : '',
      ]

      return parts.filter(Boolean).join(' | ')
    })
    .join('\n\n')
}

/**
 * Format user impact data for inclusion in AI prompt
 */
export function formatUserImpactContext(impact: NonNullable<Awaited<ReturnType<typeof retrieveUserImpact>>>): string {
  const parts = [
    `Estimated dollars kept local: $${impact.estimatedDollarsKeptLocal.toFixed(2)}`,
    `Businesses supported: ${impact.businessesSupported}`,
    `Reviews left: ${impact.reviewsLeft}`,
    `Total check-ins: ${impact.totalCheckIns}`,
    `Missions completed: ${impact.missionsCompleted}`,
  ]

  return parts.join('\n')
}

/**
 * Main RAG retrieval function - combines all retrieval operations
 */
export async function retrieveContext(
  query: string,
  userContext?: UserContext
): Promise<{
  businessContext: string
  userImpactContext?: string
  hasRelevantBusinesses: boolean
}> {
  // Determine query type and retrieve appropriate data
  const lowerQuery = query.toLowerCase()

  // Check if this is an impact-related query
  const isImpactQuery =
    lowerQuery.includes('impact') ||
    lowerQuery.includes('dollar') ||
    lowerQuery.includes('money') ||
    lowerQuery.includes('community') ||
    lowerQuery.includes('help') ||
    lowerQuery.includes('difference') ||
    lowerQuery.includes('my contribution')

  // Check if this is a business discovery query
  const isDiscoveryQuery =
    lowerQuery.includes('find') ||
    lowerQuery.includes('recommend') ||
    lowerQuery.includes('suggest') ||
    lowerQuery.includes('where') ||
    lowerQuery.includes('best') ||
    lowerQuery.includes('good') ||
    lowerQuery.includes('looking for') ||
    detectCategory(query) !== null

  let businesses: BusinessWithCategory[] = []
  let userImpact = null

  // Retrieve businesses for discovery queries
  if (isDiscoveryQuery) {
    const ragResult = await retrieveBusinesses(query, userContext, 5)
    businesses = ragResult.businesses
  }

  // Retrieve user impact data if available
  if (userContext?.userId && (isImpactQuery || lowerQuery.includes('my impact'))) {
    userImpact = await retrieveUserImpact(userContext.userId)
  }

  return {
    businessContext: formatBusinessContext({
      businesses,
      categories: [],
      totalCount: businesses.length,
      queryUsed: query,
    }),
    userImpactContext: userImpact ? formatUserImpactContext(userImpact) : undefined,
    hasRelevantBusinesses: businesses.length > 0,
  }
}
