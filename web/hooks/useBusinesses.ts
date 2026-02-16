'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAnnouncer } from '@/hooks/useAnnouncer'
import type { Business, BusinessWithCategory, BusinessWithDetails, BusinessSearchFilters, LatLng } from '@/types/business'

// ============================================================================
// Query Keys
// ============================================================================

/** React Query key factory for business-related queries. Provides hierarchical cache keys for lists, details, search, and nearby queries. */
const businessKeys = {
  all: ['businesses'] as const,
  lists: () => [...businessKeys.all, 'list'] as const,
  list: (filters: BusinessSearchFilters & { page?: number; limit?: number }) =>
    [...businessKeys.lists(), filters] as const,
  details: () => [...businessKeys.all, 'detail'] as const,
  detail: (id: string) => [...businessKeys.details(), id] as const,
  search: (query: string, location?: LatLng) =>
    [...businessKeys.all, 'search', query, location] as const,
  byCategory: (categorySlug: string) =>
    [...businessKeys.lists(), 'category', categorySlug] as const,
  featured: () => [...businessKeys.lists(), 'featured'] as const,
  nearby: (location: LatLng, radius?: number, category?: string) =>
    [...businessKeys.lists(), 'nearby', location, radius, category] as const,
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchBusinesses(
  filters?: BusinessSearchFilters,
  page = 1,
  limit = 20
): Promise<{ businesses: BusinessWithCategory[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams()
  if (filters?.category) params.set('category', filters.category)
  if (filters?.priceRange) params.set('priceRange', filters.priceRange.join(','))
  if (filters?.rating) params.set('rating', filters.rating.toString())
  if (filters?.openNow) params.set('openNow', 'true')
  if (filters?.distance) params.set('distance', filters.distance.toString())
  if (filters?.sortBy) params.set('sortBy', filters.sortBy)
  params.set('page', page.toString())
  params.set('limit', limit.toString())

  const response = await fetch(`/api/businesses?${params}`)
  if (!response.ok) throw new Error('Failed to fetch businesses')
  return response.json()
}

async function fetchBusiness(id: string): Promise<BusinessWithDetails> {
  const response = await fetch(`/api/businesses/${id}`)
  if (!response.ok) throw new Error('Failed to fetch business')
  return response.json()
}

async function searchBusinesses(
  query: string,
  location?: LatLng
): Promise<{ places: BusinessWithCategory[]; fromCache: boolean }> {
  const params = new URLSearchParams()
  params.set('q', query)
  if (location) {
    params.set('lat', location.lat.toString())
    params.set('lng', location.lng.toString())
  }

  const response = await fetch(`/api/businesses/search?${params}`)
  if (!response.ok) throw new Error('Failed to search businesses')
  return response.json()
}

async function fetchBusinessesByCategory(categorySlug: string): Promise<BusinessWithCategory[]> {
  const response = await fetch(`/api/categories/${categorySlug}/businesses`)
  if (!response.ok) throw new Error('Failed to fetch businesses by category')
  return response.json()
}

async function fetchFeaturedBusinesses(): Promise<BusinessWithCategory[]> {
  const response = await fetch('/api/businesses/featured')
  if (!response.ok) throw new Error('Failed to fetch featured businesses')
  return response.json()
}

async function fetchNearbyBusinesses(
  location: LatLng,
  radius = 5000,
  category?: string
): Promise<BusinessWithCategory[]> {
  const params = new URLSearchParams()
  params.set('lat', location.lat.toString())
  params.set('lng', location.lng.toString())
  params.set('radius', radius.toString())
  if (category && category !== 'all') {
    params.set('category', category)
  }

  const response = await fetch(`/api/businesses/nearby?${params}`)
  if (!response.ok) throw new Error('Failed to fetch nearby businesses')
  return response.json()
}

// ============================================================================
// Mutations
// ============================================================================

async function createBusiness(data: Partial<Business>): Promise<Business> {
  const response = await fetch('/api/businesses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create business')
  return response.json()
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch a paginated list of businesses with optional filters.
 * @param filters - Category, price range, rating, distance, and sort options
 * @param page - Page number (1-indexed)
 * @param limit - Results per page (default 20)
 * @returns React Query result with businesses array, total count, and hasMore flag
 */
export function useBusinesses(
  filters?: BusinessSearchFilters,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: businessKeys.list({ ...filters, page, limit }),
    queryFn: () => fetchBusinesses(filters, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single business by ID, including reviews, deals, and bookmark status.
 * @param id - Business UUID
 * @returns React Query result with full business details
 */
export function useBusiness(id: string) {
  return useQuery({
    queryKey: businessKeys.detail(id),
    queryFn: () => fetchBusiness(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Search businesses by text query. Only fires when query is at least 2 characters.
 * Announces results to screen readers for accessibility.
 * @param query - Search text (minimum 2 chars to enable)
 * @param location - Optional coordinates to bias results toward
 * @returns React Query result with matching places and cache status
 */
export function useBusinessSearch(query: string, location?: LatLng) {
  const { announceLoading, announceSuccess } = useAnnouncer()

  return useQuery({
    queryKey: businessKeys.search(query, location),
    queryFn: async () => {
      announceLoading('Searching businesses...')
      const result = await searchBusinesses(query, location)
      announceSuccess(`Found ${result.places.length} results`)
      return result
    },
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Fetch all businesses in a given category.
 * @param categorySlug - Category identifier (e.g., "food-drink", "retail")
 */
export function useBusinessesByCategory(categorySlug: string) {
  return useQuery({
    queryKey: businessKeys.byCategory(categorySlug),
    queryFn: () => fetchBusinessesByCategory(categorySlug),
    enabled: !!categorySlug,
    staleTime: 10 * 60 * 1000,
  })
}

/** Fetch editorially featured businesses for the homepage spotlight. */
export function useFeaturedBusinesses() {
  return useQuery({
    queryKey: businessKeys.featured(),
    queryFn: fetchFeaturedBusinesses,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Fetch businesses near a geographic location. Syncs from Google Places API if
 * the local database has insufficient results. Announces loading and results to
 * screen readers for accessibility.
 * @param location - User's coordinates (null disables the query)
 * @param radius - Search radius in meters (default 5000)
 * @param category - Optional category slug to filter by
 */
export function useNearbyBusinesses(location?: LatLng | null, radius = 5000, category?: string) {
  const { announceLoading, announceSuccess } = useAnnouncer()

  return useQuery({
    queryKey: businessKeys.nearby(location || { lat: 0, lng: 0 }, radius, category),
    queryFn: async () => {
      announceLoading('Finding nearby businesses...')
      const result = await fetchNearbyBusinesses(location!, radius, category)
      announceSuccess(`Found ${result.length} businesses nearby`)
      return result
    },
    enabled: !!location,
    staleTime: 5 * 60 * 1000,
  })
}

/** Mutation to create a new business listing. Invalidates all business list queries on success. */
export function useCreateBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() })
    },
  })
}
