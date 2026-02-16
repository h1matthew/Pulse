/**
 * Impact Report Generator
 *
 * Provides types, CSV generation, and download utilities for the
 * Impact Report Export feature on the dashboard.
 */

import { startOfWeek, startOfMonth, formatISO, format } from 'date-fns'

// ============================================================================
// Types
// ============================================================================

export type DateRangeOption = 'week' | 'month' | 'all_time'

export interface ReportCategoryBreakdown {
  category: string
  checkIns: number
  dollarsSpent: number
}

export interface ReportBusiness {
  name: string
  category: string
  checkIns: number
  totalSpent: number
  lastVisit: string
}

export interface ReportReview {
  businessName: string
  rating: number
  content: string
  createdAt: string
}

export interface ReportDeal {
  dealTitle: string
  businessName: string
  claimedAt: string
  redeemedAt: string | null
}

export interface ReportTimelineItem {
  type: string
  businessName: string
  detail: string
  date: string
}

export interface ImpactReportData {
  dateRange: { from: string | null; to: string }
  metrics: {
    dollarsKeptLocal: number
    businessesSupported: number
    jobsImpacted: number
    carbonSaved: number
    reviewsLeft: number
    dealsClaimed: number
    totalCheckIns: number
  }
  tier: { name: string; icon: string }
  categoryBreakdown: ReportCategoryBreakdown[]
  businesses: ReportBusiness[]
  reviews: ReportReview[]
  deals: ReportDeal[]
  timeline: ReportTimelineItem[]
}

// ============================================================================
// Date Range Helpers
// ============================================================================

/**
 * Returns date range parameters for the report API.
 * "all_time" returns no `from` so the API omits the date filter.
 */
export function getDateRangeParams(range: DateRangeOption): { from?: string; to: string } {
  const now = new Date()
  const to = formatISO(now, { representation: 'date' })

  switch (range) {
    case 'week':
      return { from: formatISO(startOfWeek(now), { representation: 'date' }), to }
    case 'month':
      return { from: formatISO(startOfMonth(now), { representation: 'date' }), to }
    case 'all_time':
      return { to }
  }
}

/** Human-readable label for a date range option. */
export function getDateRangeLabel(range: DateRangeOption): string {
  switch (range) {
    case 'week':
      return 'This Week'
    case 'month':
      return 'This Month'
    case 'all_time':
      return 'All Time'
  }
}

// ============================================================================
// CSV Generation
// ============================================================================

/** Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines). */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generate a multi-section CSV string from report data.
 * Sections: Summary, Businesses Supported, Reviews, Deals Claimed, Activity Timeline.
 */
export function generateCSV(data: ImpactReportData): string {
  const rows: string[] = []

  // Header
  rows.push('Pulse Impact Report')
  const fromLabel = data.dateRange.from
    ? format(new Date(data.dateRange.from), 'MMM d, yyyy')
    : 'Beginning'
  const toLabel = format(new Date(data.dateRange.to), 'MMM d, yyyy')
  rows.push(`Date Range,${escapeCSV(`${fromLabel} - ${toLabel}`)}`)
  rows.push('')

  // Summary
  rows.push('=== Impact Summary ===')
  rows.push('Metric,Value')
  rows.push(`Dollars Kept Local,$${data.metrics.dollarsKeptLocal.toLocaleString()}`)
  rows.push(`Businesses Supported,${data.metrics.businessesSupported}`)
  rows.push(`Jobs Impacted,${data.metrics.jobsImpacted}`)
  rows.push(`Carbon Saved (lbs),${data.metrics.carbonSaved}`)
  rows.push(`Reviews Left,${data.metrics.reviewsLeft}`)
  rows.push(`Deals Claimed,${data.metrics.dealsClaimed}`)
  rows.push(`Total Check-ins,${data.metrics.totalCheckIns}`)
  rows.push(`Impact Tier,${escapeCSV(`${data.tier.icon} ${data.tier.name}`)}`)
  rows.push('')

  // Category Breakdown
  if (data.categoryBreakdown.length > 0) {
    rows.push('=== Category Breakdown ===')
    rows.push('Category,Check-ins,Dollars Spent')
    for (const cat of data.categoryBreakdown) {
      rows.push(`${escapeCSV(cat.category)},${cat.checkIns},$${cat.dollarsSpent.toLocaleString()}`)
    }
    rows.push('')
  }

  // Businesses
  if (data.businesses.length > 0) {
    rows.push('=== Businesses Supported ===')
    rows.push('Business Name,Category,Check-ins,Total Spent,Last Visit')
    for (const b of data.businesses) {
      rows.push(
        `${escapeCSV(b.name)},${escapeCSV(b.category)},${b.checkIns},$${b.totalSpent.toLocaleString()},${b.lastVisit}`
      )
    }
    rows.push('')
  }

  // Reviews
  if (data.reviews.length > 0) {
    rows.push('=== Reviews ===')
    rows.push('Business,Rating,Content,Date')
    for (const r of data.reviews) {
      rows.push(
        `${escapeCSV(r.businessName)},${r.rating},${escapeCSV(r.content)},${r.createdAt}`
      )
    }
    rows.push('')
  }

  // Deals
  if (data.deals.length > 0) {
    rows.push('=== Deals Claimed ===')
    rows.push('Deal,Business,Claimed,Redeemed')
    for (const d of data.deals) {
      rows.push(
        `${escapeCSV(d.dealTitle)},${escapeCSV(d.businessName)},${d.claimedAt},${d.redeemedAt || 'Pending'}`
      )
    }
    rows.push('')
  }

  // Timeline
  if (data.timeline.length > 0) {
    rows.push('=== Activity Timeline ===')
    rows.push('Type,Business,Detail,Date')
    for (const t of data.timeline) {
      rows.push(
        `${escapeCSV(t.type)},${escapeCSV(t.businessName)},${escapeCSV(t.detail)},${t.date}`
      )
    }
  }

  return rows.join('\n')
}

/**
 * Triggers a CSV file download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
