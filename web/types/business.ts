// ============================================================================
// Business Types
// ============================================================================

export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Business {
  id: string
  name: string
  slug: string
  category_id: string | null
  description: string | null
  short_description: string | null
  address: string
  city: string
  state: string
  zip_code: string
  phone: string | null
  email: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
  hours: BusinessHours
  photos: Array<string | BusinessPhotoReference>
  logo_url: string | null
  owner_id: string | null
  is_verified: boolean
  is_featured: boolean
  price_range: number | null
  tags: string[]
  amenities: string[]
  average_rating: number
  review_count: number
  bookmark_count: number
  place_id: string | null
  data_source: 'google' | 'osm' | 'user_added'
  last_synced_at: string | null
  sync_status: 'active' | 'stale' | 'error'
  claimed_at: string | null
  created_at: string
  updated_at: string
  ai_description: string | null
  ai_description_generated_at: string | null
  ai_description_source: string | null
  editorial_summary: string | null
  ai_business_summary: string | null
}

export interface BusinessHours {
  monday?: string
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

export interface BusinessPhotoReference {
  photo_reference: string
  height?: number
  width?: number
}

export interface BusinessWithCategory extends Business {
  category: Category | null
}

export interface BusinessWithDetails extends BusinessWithCategory {
  reviews: ReviewWithUser[]
  external_reviews?: ExternalReview[]
  deals: Deal[]
  is_bookmarked?: boolean
  user_check_in_count?: number
  local_review_count?: number
}

// ============================================================================
// Review Types
// ============================================================================

export interface Review {
  id: string
  business_id: string
  user_id: string | null
  rating: number
  content: string
  photos: string[]
  verified_purchase: boolean
  helpful_count: number
  is_featured: boolean
  source: 'pulse' | 'google' | 'yelp'
  external_id: string | null
  external_author_name: string | null
  external_author_photo: string | null
  external_time: string | null
  created_at: string
  updated_at: string
}

export interface ReviewWithUser extends Review {
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface ExternalReview {
  id: string
  source: 'google'
  rating: number
  content: string
  author_name: string
  author_photo_url?: string | null
  author_profile_url?: string | null
  created_at?: string | null
  relative_time?: string | null
  maps_url?: string | null
}

export interface ReviewCreateInput {
  business_id: string
  rating: number
  content: string
  photos?: string[]
}

// ============================================================================
// Bookmark Types
// ============================================================================

export interface BusinessBookmark {
  id: string
  user_id: string
  business_id: string
  note: string | null
  created_at: string
}

export interface BookmarkWithBusiness extends BusinessBookmark {
  business: BusinessWithCategory
}

// ============================================================================
// Deal Types
// ============================================================================

export type DealType = 'standard' | 'boost_mission' | 'flash' | 'loyalty'
export type DiscountType = 'percentage' | 'fixed_amount' | 'free_item' | 'bogo'

export interface Deal {
  id: string
  business_id: string
  title: string
  description: string
  deal_type: DealType
  discount_type: DiscountType
  discount_value: number | null
  minimum_purchase: number | null
  mission_requirement: string | null
  code: string | null
  qr_code_url: string | null
  usage_limit: number | null
  usage_count: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  source: 'manual' | 'scraped'
  created_at: string
  updated_at: string
}

export interface DealWithBusiness extends Deal {
  business: BusinessWithCategory
}

export interface DealClaim {
  id: string
  deal_id: string
  user_id: string
  claimed_at: string
  redeemed_at: string | null
  redeemed_code: string | null
}

export interface DealClaimWithDeal extends DealClaim {
  deal: DealWithBusiness
}

// ============================================================================
// Check-in Types
// ============================================================================

export interface BusinessCheckIn {
  id: string
  business_id: string
  user_id: string
  check_in_at: string
  latitude: number | null
  longitude: number | null
  verified_by_location: boolean
  spend_amount: number | null
  notes: string | null
}

// ============================================================================
// Search & Filter Types
// ============================================================================

export interface BusinessSearchFilters {
  category?: string
  priceRange?: number[]
  rating?: number
  openNow?: boolean
  distance?: number // in miles
  sortBy?: 'rating' | 'distance' | 'review_count' | 'name'
}

export interface BusinessSearchResult {
  businesses: BusinessWithCategory[]
  totalCount: number
  hasMore: boolean
}

export interface LatLng {
  lat: number
  lng: number
}

// ============================================================================
// Google Places API Types
// ============================================================================

export interface GooglePlace {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  formatted_phone_number?: string
  website?: string
  price_level?: number
  rating?: number
  user_ratings_total?: number
  photos?: GooglePlacePhoto[]
  opening_hours?: {
    weekday_text: string[]
    open_now?: boolean
  }
  types: string[]
}

export interface GooglePlacePhoto {
  photo_reference: string
  height: number
  width: number
  html_attributions: string[]
}

export interface CachedPlace {
  place_id: string
  name: string
  address: string
  latitude: number
  longitude: number
  data: GooglePlace
  cached_at: string
  expires_at: string
}
