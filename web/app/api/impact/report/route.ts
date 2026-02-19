/**
 * Impact Report API Route
 *
 * Aggregates user activity data (check-ins, reviews, deal claims, bookmarks,
 * missions) with optional date-range filtering for the Impact Report Export.
 *
 * GET /api/impact/report?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ImpactReportData } from '@/lib/report-generator'
import {
  getDemoImpactReport,
  shouldUseDemoStatsForUser,
} from '@/lib/demo/demo-account-stats'

/** Percentage of spend that stays in local economy (matches impact-calculator.ts) */
const LOCAL_ECONOMIC_MULTIPLIER = 0.68
/** Default average spend when not specified */
const DEFAULT_AVG_SPEND = 35
/** Lbs CO2 saved per local purchase */
const CO2_SAVINGS_PER_PURCHASE = 0.5

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const dateRange = { from, to: to || new Date().toISOString().split('T')[0] }

    if (shouldUseDemoStatsForUser(user)) {
      return NextResponse.json(getDemoImpactReport(dateRange))
    }

    // Build parallel queries with date filtering
    const [checkInsResult, reviewsResult, claimsResult, bookmarksResult, missionsResult] =
      await Promise.all([
        fetchCheckIns(supabase, user.id, from, to),
        fetchReviews(supabase, user.id, from, to),
        fetchDealClaims(supabase, user.id, from, to),
        fetchBookmarks(supabase, user.id, from, to),
        fetchMissions(supabase, user.id, from, to),
      ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Row = Record<string, any>
    const checkIns: Row[] = checkInsResult.data || []
    const reviews: Row[] = reviewsResult.data || []
    const claims: Row[] = claimsResult.data || []
    const bookmarks: Row[] = bookmarksResult.data || []
    const missions: Row[] = missionsResult.data || []

    // Aggregate category breakdown from check-ins
    const categoryMap = new Map<string, { checkIns: number; dollarsSpent: number }>()
    const businessMap = new Map<
      string,
      { name: string; category: string; checkIns: number; totalSpent: number; lastVisit: string }
    >()

    for (const ci of checkIns) {
      const biz = extractRelation<{ name: string; categories: unknown }>(ci.businesses)
      const cat = biz ? extractRelation<{ name: string }>(biz.categories) : null
      const bizName = biz?.name || 'Unknown Business'
      const catName = cat?.name || 'Other'
      const spend = Number(ci.spend_amount) || DEFAULT_AVG_SPEND

      // Category aggregation
      const existing = categoryMap.get(catName) || { checkIns: 0, dollarsSpent: 0 }
      existing.checkIns += 1
      existing.dollarsSpent += spend
      categoryMap.set(catName, existing)

      // Business aggregation
      const bizKey = ci.business_id
      const existingBiz = businessMap.get(bizKey) || {
        name: bizName,
        category: catName,
        checkIns: 0,
        totalSpent: 0,
        lastVisit: ci.check_in_at,
      }
      existingBiz.checkIns += 1
      existingBiz.totalSpent += spend
      if (new Date(ci.check_in_at) > new Date(existingBiz.lastVisit)) {
        existingBiz.lastVisit = ci.check_in_at
      }
      businessMap.set(bizKey, existingBiz)
    }

    // Calculate metrics
    const totalCheckIns = checkIns.length
    const totalSpend = checkIns.reduce(
      (sum, ci) => sum + (Number(ci.spend_amount) || DEFAULT_AVG_SPEND),
      0
    )
    const dollarsKeptLocal = Math.round(totalSpend * LOCAL_ECONOMIC_MULTIPLIER)
    const uniqueBusinesses = new Set(checkIns.map((ci) => ci.business_id)).size
    const jobsImpacted = Math.max(totalCheckIns > 0 ? 1 : 0, Math.floor(dollarsKeptLocal / 100_000))
    const carbonSaved = Math.round(totalCheckIns * CO2_SAVINGS_PER_PURCHASE * 10) / 10

    // Determine tier
    const tierConfig = getTierForDollars(dollarsKeptLocal)

    // Build timeline
    const timeline = buildTimeline(checkIns, reviews, claims, bookmarks, missions)

    // Format response
    const report: ImpactReportData = {
      dateRange,
      metrics: {
        dollarsKeptLocal,
        businessesSupported: uniqueBusinesses,
        jobsImpacted,
        carbonSaved,
        reviewsLeft: reviews.length,
        dealsClaimed: claims.length,
        totalCheckIns,
      },
      tier: tierConfig,
      categoryBreakdown: Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.checkIns - a.checkIns),
      businesses: Array.from(businessMap.values())
        .sort((a, b) => b.checkIns - a.checkIns)
        .slice(0, 50),
      reviews: reviews.slice(0, 50).map((r) => ({
        businessName: extractRelation<{ name: string }>(r.businesses)?.name || 'Unknown Business',
        rating: r.rating,
        content: r.content,
        createdAt: r.created_at,
      })),
      deals: claims.slice(0, 50).map((c) => {
        const deal = extractRelation<{ title: string; businesses: unknown }>(c.deals)
        const dealBiz = deal ? extractRelation<{ name: string }>(deal.businesses) : null
        return {
          dealTitle: deal?.title || 'Unknown Deal',
          businessName: dealBiz?.name || 'Unknown Business',
          claimedAt: c.claimed_at,
          redeemedAt: c.redeemed_at,
        }
      }),
      timeline: timeline.slice(0, 50),
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error in impact report API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Supabase returns foreign key relations as objects or arrays depending on
 * cardinality. This helper safely extracts the first element if it's an array,
 * or returns the object directly.
 */
function extractRelation<T>(relation: unknown): T | null {
  if (Array.isArray(relation)) return (relation[0] as T) ?? null
  if (relation && typeof relation === 'object') return relation as T
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

function applyDateFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  column: string,
  from: string | null,
  to: string | null
) {
  if (from) query = query.gte(column, from)
  if (to) query = query.lte(column, `${to}T23:59:59.999Z`)
  return query
}

async function fetchCheckIns(supabase: SupabaseClient, userId: string, from: string | null, to: string | null) {
  let query = supabase
    .from('business_check_ins')
    .select(`
      id, business_id, check_in_at, spend_amount,
      businesses (name, categories (name))
    `)
    .eq('user_id', userId)
    .order('check_in_at', { ascending: false })
    .limit(200)

  query = applyDateFilter(query, 'check_in_at', from, to)
  return query
}

async function fetchReviews(supabase: SupabaseClient, userId: string, from: string | null, to: string | null) {
  let query = supabase
    .from('reviews')
    .select(`
      id, business_id, rating, content, created_at,
      businesses (name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  query = applyDateFilter(query, 'created_at', from, to)
  return query
}

async function fetchDealClaims(supabase: SupabaseClient, userId: string, from: string | null, to: string | null) {
  let query = supabase
    .from('deal_claims')
    .select(`
      id, claimed_at, redeemed_at,
      deals (title, businesses (name))
    `)
    .eq('user_id', userId)
    .order('claimed_at', { ascending: false })
    .limit(50)

  query = applyDateFilter(query, 'claimed_at', from, to)
  return query
}

async function fetchBookmarks(supabase: SupabaseClient, userId: string, from: string | null, to: string | null) {
  let query = supabase
    .from('business_bookmarks')
    .select(`
      id, created_at,
      businesses (name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  query = applyDateFilter(query, 'created_at', from, to)
  return query
}

async function fetchMissions(supabase: SupabaseClient, userId: string, from: string | null, to: string | null) {
  let query = supabase
    .from('user_mission_progress')
    .select(`
      id, is_completed, completed_at,
      boost_missions (title)
    `)
    .eq('user_id', userId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .limit(50)

  if (from) query = query.gte('completed_at', from)
  if (to) query = query.lte('completed_at', `${to}T23:59:59.999Z`)
  return query
}

// ============================================================================
// Aggregation Helpers
// ============================================================================

function getTierForDollars(dollars: number): { name: string; icon: string } {
  const tiers = [
    { min: 5000, name: 'Economic Hero', icon: '🦸' },
    { min: 2500, name: 'Local Legend', icon: '👑' },
    { min: 1000, name: 'Pulse Champion', icon: '🏆' },
    { min: 500, name: 'Community Advocate', icon: '🌟' },
    { min: 100, name: 'Local Supporter', icon: '💚' },
    { min: 0, name: 'Pulse Newcomer', icon: '🌱' },
  ]
  for (const t of tiers) {
    if (dollars >= t.min) return { name: t.name, icon: t.icon }
  }
  return { name: 'Pulse Newcomer', icon: '🌱' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTimeline(...sources: any[][]): ReportTimelineItemRaw[] {
  const items: ReportTimelineItemRaw[] = []

  const [checkIns, reviews, claims, bookmarks, missions] = sources

  for (const ci of checkIns || []) {
    const biz = extractRelation<{ name: string }>(ci.businesses)
    items.push({
      type: 'Check-in',
      businessName: biz?.name || 'Unknown Business',
      detail: ci.spend_amount ? `Spent $${ci.spend_amount}` : 'Visited',
      date: ci.check_in_at,
    })
  }

  for (const r of reviews || []) {
    const biz = extractRelation<{ name: string }>(r.businesses)
    items.push({
      type: 'Review',
      businessName: biz?.name || 'Unknown Business',
      detail: `Rated ${r.rating}/5`,
      date: r.created_at,
    })
  }

  for (const c of claims || []) {
    const deal = extractRelation<{ title: string; businesses: unknown }>(c.deals)
    const dealBiz = deal ? extractRelation<{ name: string }>(deal.businesses) : null
    items.push({
      type: 'Deal Claimed',
      businessName: dealBiz?.name || 'Unknown Business',
      detail: deal?.title || 'Deal',
      date: c.claimed_at,
    })
  }

  for (const b of bookmarks || []) {
    const biz = extractRelation<{ name: string }>(b.businesses)
    items.push({
      type: 'Bookmark',
      businessName: biz?.name || 'Unknown Business',
      detail: 'Saved to bookmarks',
      date: b.created_at,
    })
  }

  for (const m of missions || []) {
    const mission = extractRelation<{ title: string }>(m.boost_missions)
    items.push({
      type: 'Mission Complete',
      businessName: '',
      detail: mission?.title || 'Mission completed',
      date: m.completed_at || m.created_at,
    })
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return items
}

interface ReportTimelineItemRaw {
  type: string
  businessName: string
  detail: string
  date: string
}
