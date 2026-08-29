import {
  LayoutDashboard,
  Medal,
  Trophy,
  Store,
  MapPin,
  Heart,
  Star,
  Zap,
  Tag,
  Target,
  Users,
  Shield,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface NavSection {
  title: string
  items: NavItem[]
  adminOnly?: boolean
}

export const SIDEBAR_NAVIGATION: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Discover',
    items: [
      { href: '/discover', label: 'Explore', icon: Store },
      { href: '/categories', label: 'Categories', icon: MapPin },
      { href: '/deals', label: 'Deals', icon: Tag },
    ],
  },
  {
    title: 'Engage',
    items: [
      { href: '/missions', label: 'Missions', icon: Zap },
      { href: '/bookmarks', label: 'Bookmarks', icon: Heart },
      { href: '/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    title: 'Community',
    items: [
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { href: '/achievements', label: 'Achievements', icon: Medal },
      { href: '/for-you', label: 'For You', icon: Target },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin', label: 'Admin', icon: Shield },
    ],
    adminOnly: true,
  },
]

// Public navigation for header
export const PUBLIC_NAVIGATION: NavItem[] = [
  { href: '/discover', label: 'Discover', icon: Store },
  { href: '/categories', label: 'Categories', icon: MapPin },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/about', label: 'About', icon: Users },
]

// Category filters for discover page
export const CATEGORY_FILTERS = [
  { id: 'all', name: 'All', icon: '✨' },
  { id: 'food-drink', name: 'Food & Drink', icon: '🍽️' },
  { id: 'retail', name: 'Retail', icon: '🛍️' },
  { id: 'services', name: 'Services', icon: '🛠️' },
  { id: 'health-wellness', name: 'Health & Wellness', icon: '💪' },
  { id: 'arts-culture', name: 'Arts & Culture', icon: '🎨' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎭' },
]

// Sort options for business listings
export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'newest', label: 'Newest' },
  { value: 'distance', label: 'Closest' },
]

// Price range filters
export const PRICE_RANGES = [
  { value: '1', label: '$', description: 'Inexpensive' },
  { value: '2', label: '$$', description: 'Moderate' },
  { value: '3', label: '$$$', description: 'Expensive' },
  { value: '4', label: '$$$$', description: 'Very expensive' },
]
