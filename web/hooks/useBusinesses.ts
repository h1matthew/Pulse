'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Business, BusinessWithCategory, BusinessWithDetails, BusinessSearchFilters, LatLng } from '@/types/business'

// ============================================================================
// Query Keys
// ============================================================================

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
  nearby: (location: LatLng, radius?: number) =>
    [...businessKeys.lists(), 'nearby', location, radius] as const,
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
  radius = 5000
): Promise<BusinessWithCategory[]> {
  const params = new URLSearchParams()
  params.set('lat', location.lat.toString())
  params.set('lng', location.lng.toString())
  params.set('radius', radius.toString())

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

export function useBusiness(id: string) {
  return useQuery({
    queryKey: businessKeys.detail(id),
    queryFn: () => fetchBusiness(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBusinessSearch(query: string, location?: LatLng) {
  return useQuery({
    queryKey: businessKeys.search(query, location),
    queryFn: () => searchBusinesses(query, location),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
  })
}

export function useBusinessesByCategory(categorySlug: string) {
  return useQuery({
    queryKey: businessKeys.byCategory(categorySlug),
    queryFn: () => fetchBusinessesByCategory(categorySlug),
    enabled: !!categorySlug,
    staleTime: 10 * 60 * 1000,
  })
}

export function useFeaturedBusinesses() {
  return useQuery({
    queryKey: businessKeys.featured(),
    queryFn: fetchFeaturedBusinesses,
    staleTime: 10 * 60 * 1000,
  })
}

export function useNearbyBusinesses(location?: LatLng, radius = 5000) {
  return useQuery({
    queryKey: businessKeys.nearby(location || { lat: 0, lng: 0 }, radius),
    queryFn: () => fetchNearbyBusinesses(location!, radius),
    enabled: !!location,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateBusiness() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() })
    },
  })
}
