/**
 * Demo Deal Templates
 *
 * Shared fallback deal data used when no real deals exist in the database.
 * Referenced by both the deals listing API (/api/deals) and the business
 * detail API (/api/businesses/[id]) to ensure consistent demo content.
 */

export const DEMO_DEAL_BUSINESS_NAMES = [
  'H Mart Diamond Bar',
  '99 Ranch Market',
  'The Boiling Crab',
  'Chubby Cattle BBQ | Rowland Heights',
  'AMC Puente Hills 20',
  'Round1 Bowling & Arcade - Puente Hills Mall',
] as const

export const DEMO_DEAL_TEMPLATES = [
  {
    businessName: 'H Mart Diamond Bar',
    title: 'Weeknight Bento Bundle',
    description: 'Save on ready-to-serve meal sets from 5pm to close.',
    deal_type: 'standard',
    discount_type: 'percentage',
    discount_value: 15,
    code: 'HMART15',
    expiresInDays: 18,
  },
  {
    businessName: '99 Ranch Market',
    title: 'Fresh Produce Friday',
    description: 'Get a produce discount when your basket includes 5+ produce items.',
    deal_type: 'flash',
    discount_type: 'percentage',
    discount_value: 20,
    code: 'RANCH20',
    expiresInDays: 10,
  },
  {
    businessName: 'The Boiling Crab',
    title: 'Seafood Combo Perk',
    description: 'Receive a discounted combo add-on with any two-pound seafood order.',
    deal_type: 'standard',
    discount_type: 'fixed_amount',
    discount_value: 8,
    code: 'CRAB8',
    expiresInDays: 14,
  },
  {
    businessName: 'Chubby Cattle BBQ | Rowland Heights',
    title: 'Boost Mission: Bring a Friend',
    description: 'Complete a mission visit with a friend and unlock a reward discount.',
    deal_type: 'boost_mission',
    discount_type: 'percentage',
    discount_value: 12,
    code: 'CHUBBY12',
    mission_requirement: 'Check in with 1 friend this week',
    expiresInDays: 21,
  },
  {
    businessName: 'AMC Puente Hills 20',
    title: 'Matinee Movie Saver',
    description: 'Save on weekday matinee tickets before 4 PM.',
    deal_type: 'flash',
    discount_type: 'fixed_amount',
    discount_value: 5,
    code: 'AMC5',
    expiresInDays: 12,
  },
  {
    businessName: 'Round1 Bowling & Arcade - Puente Hills Mall',
    title: 'Arcade Credit Bonus',
    description: 'Buy credits and receive bonus arcade credits on your first swipe.',
    deal_type: 'standard',
    discount_type: 'free_item',
    discount_value: null,
    code: 'ROUND1BONUS',
    expiresInDays: 20,
  },
] as const

/** Return an ISO date string `days` in the future. */
export function dateDaysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}
