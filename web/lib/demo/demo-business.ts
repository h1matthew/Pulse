/**
 * Onboarding Tour Demo Business
 *
 * A fully-populated, fake business used ONLY by the guided onboarding tour.
 * Real businesses can have zero deals or reviews, which makes the deals and
 * reviews steps look empty. The tour opens this demo business instead so every
 * step always has rich content to point at — guaranteed deals, reviews, hours,
 * and ratings.
 *
 * It is returned client-side by `fetchBusiness()` (see hooks/useBusinesses.ts)
 * for the reserved id below, so it never touches the database or any API.
 */
import type { BusinessWithDetails, Category, Deal, ReviewWithUser } from '@/types/business'

/** Reserved business id the tour navigates to: /business/onboarding-demo */
export const TOUR_DEMO_BUSINESS_ID = 'onboarding-demo'

/** Route the onboarding tour opens for its business steps. */
export const TOUR_DEMO_BUSINESS_PATH = `/business/${TOUR_DEMO_BUSINESS_ID}`

/** ISO timestamp `days` in the past (negative) or future (positive). */
function isoDaysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const DEMO_CATEGORY: Category = {
  id: 'demo-category-food-drink',
  slug: 'food-drink',
  name: 'Food & Drink',
  description: 'Restaurants, cafes, bakeries, and more.',
  icon: 'utensils',
  color: 'var(--chart-1)',
  sort_order: 1,
  is_active: true,
  created_at: isoDaysFromNow(-400),
}

const DEMO_DEALS: Deal[] = [
  {
    id: 'demo-onboarding-deal-1',
    business_id: TOUR_DEMO_BUSINESS_ID,
    title: 'Weekday Lunch Special',
    description: '15% off any lunch entrée, Monday through Friday before 3pm.',
    deal_type: 'standard',
    discount_type: 'percentage',
    discount_value: 15,
    minimum_purchase: null,
    mission_requirement: null,
    code: 'LUNCH15',
    qr_code_url: null,
    usage_limit: null,
    usage_count: 42,
    start_date: isoDaysFromNow(-20),
    end_date: isoDaysFromNow(25),
    is_active: true,
    source: 'manual',
    created_at: isoDaysFromNow(-20),
    updated_at: isoDaysFromNow(-2),
  },
  {
    id: 'demo-onboarding-deal-2',
    business_id: TOUR_DEMO_BUSINESS_ID,
    title: 'First Visit Treat',
    description: '$5 off your first order of $20 or more — welcome to the neighborhood!',
    deal_type: 'standard',
    discount_type: 'fixed_amount',
    discount_value: 5,
    minimum_purchase: 20,
    mission_requirement: null,
    code: 'WELCOME5',
    qr_code_url: null,
    usage_limit: null,
    usage_count: 88,
    start_date: isoDaysFromNow(-30),
    end_date: isoDaysFromNow(40),
    is_active: true,
    source: 'manual',
    created_at: isoDaysFromNow(-30),
    updated_at: isoDaysFromNow(-5),
  },
  {
    id: 'demo-onboarding-deal-3',
    business_id: TOUR_DEMO_BUSINESS_ID,
    title: 'Boost Mission: Coffee Explorer',
    description: 'Check in at 3 local coffee spots this month and unlock 20% off here.',
    deal_type: 'boost_mission',
    discount_type: 'percentage',
    discount_value: 20,
    minimum_purchase: null,
    mission_requirement: 'Check in at 3 local coffee shops this month',
    code: 'EXPLORER20',
    qr_code_url: null,
    usage_limit: null,
    usage_count: 17,
    start_date: isoDaysFromNow(-10),
    end_date: isoDaysFromNow(30),
    is_active: true,
    source: 'manual',
    created_at: isoDaysFromNow(-10),
    updated_at: isoDaysFromNow(-1),
  },
]

const DEMO_REVIEWERS = [
  { name: 'Maya R.', rating: 5, content: 'My new go-to spot. The staff remember your name and the breakfast tacos are unreal.' },
  { name: 'Devon W.', rating: 5, content: 'Cozy, locally sourced, and the cold brew is the best in the neighborhood. Highly recommend.' },
  { name: 'Priya S.', rating: 4, content: 'Great food and atmosphere. Gets busy at lunch but the line moves fast. Loved the patio.' },
  { name: 'Carlos M.', rating: 5, content: 'Family-owned and it shows. Every dish feels made with care. The lunch special is a steal.' },
  { name: 'Jenna L.', rating: 4, content: 'Friendly service and genuinely good coffee. Nice to support a local place doing it right.' },
]

const DEMO_REVIEWS: ReviewWithUser[] = DEMO_REVIEWERS.map((reviewer, index) => ({
  id: `demo-onboarding-review-${index + 1}`,
  business_id: TOUR_DEMO_BUSINESS_ID,
  user_id: `demo-user-${index + 1}`,
  rating: reviewer.rating,
  content: reviewer.content,
  photos: [],
  verified_purchase: index % 2 === 0,
  helpful_count: 12 - index * 2,
  is_featured: index === 0,
  source: 'pulse',
  external_id: null,
  external_author_name: null,
  external_author_photo: null,
  external_time: null,
  created_at: isoDaysFromNow(-(index + 1) * 4),
  updated_at: isoDaysFromNow(-(index + 1) * 4),
  user: {
    id: `demo-user-${index + 1}`,
    full_name: reviewer.name,
    avatar_url: null,
  },
}))

/**
 * Build the demo business fresh on each call so its timestamps are current
 * (deals end in the future, reviews are recent).
 */
export function getTourDemoBusiness(): BusinessWithDetails {
  return {
    id: TOUR_DEMO_BUSINESS_ID,
    name: 'La Cosecha Market & Kitchen',
    slug: TOUR_DEMO_BUSINESS_ID,
    category_id: DEMO_CATEGORY.id,
    description:
      'A family-owned neighborhood market and kitchen serving locally sourced breakfast, lunch, and the best cold brew around. Every dollar you spend here stays in the community.',
    short_description: 'Family-owned local market & kitchen with locally sourced food and great coffee.',
    address: '500 Riverwalk Avenue',
    city: 'San Antonio',
    state: 'TX',
    zip_code: '78205',
    phone: '(210) 555-0142',
    email: null,
    website: 'https://example.com/la-cosecha',
    latitude: 29.4246,
    longitude: -98.4861,
    hours: {
      monday: '7:00 AM - 6:00 PM',
      tuesday: '7:00 AM - 6:00 PM',
      wednesday: '7:00 AM - 6:00 PM',
      thursday: '7:00 AM - 6:00 PM',
      friday: '7:00 AM - 8:00 PM',
      saturday: '8:00 AM - 8:00 PM',
      sunday: '8:00 AM - 3:00 PM',
    },
    photos: [],
    logo_url: null,
    owner_id: null,
    is_verified: true,
    is_featured: true,
    price_range: 2,
    tags: ['family_owned', 'locally_sourced', 'vegetarian_options', 'coffee'],
    amenities: ['wifi', 'outdoor_seating', 'wheelchair_accessible'],
    average_rating: 4.8,
    review_count: DEMO_REVIEWS.length,
    bookmark_count: 213,
    place_id: null,
    data_source: 'user_added',
    last_synced_at: null,
    sync_status: 'active',
    claimed_at: isoDaysFromNow(-90),
    created_at: isoDaysFromNow(-365),
    updated_at: isoDaysFromNow(-1),
    ai_description:
      'La Cosecha Market & Kitchen is a beloved San Antonio staple where neighbors gather over locally roasted coffee and made-from-scratch tacos. The family behind it sources from nearby farms and pours every bit of their heart into the community.',
    ai_description_generated_at: isoDaysFromNow(-30),
    ai_description_source: 'demo',
    editorial_summary: 'Family-owned, locally sourced, and a true community hub.',
    ai_business_summary: 'Cozy family-owned market & kitchen known for locally sourced food and standout cold brew.',
    is_chain: false,
    sba_certified: true,
    category: DEMO_CATEGORY,
    reviews: DEMO_REVIEWS,
    external_reviews: [],
    deals: DEMO_DEALS,
    is_bookmarked: false,
    user_check_in_count: 0,
    local_review_count: DEMO_REVIEWS.length,
  }
}
