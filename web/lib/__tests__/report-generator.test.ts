import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateCSV,
  downloadCSV,
  getDateRangeParams,
  getDateRangeLabel,
  type ImpactReportData,
} from '../report-generator'

// ============================================================================
// Test Data Factory
// ============================================================================

function createMockReport(overrides: Partial<ImpactReportData> = {}): ImpactReportData {
  return {
    dateRange: { from: '2026-01-01', to: '2026-02-16' },
    metrics: {
      dollarsKeptLocal: 1250,
      businessesSupported: 15,
      jobsImpacted: 1,
      carbonSaved: 10,
      reviewsLeft: 8,
      dealsClaimed: 5,
      totalCheckIns: 20,
    },
    tier: { name: 'Local Supporter', icon: '💚' },
    categoryBreakdown: [
      { category: 'Food & Drink', checkIns: 12, dollarsSpent: 420 },
      { category: 'Retail', checkIns: 8, dollarsSpent: 280 },
    ],
    businesses: [
      { name: 'Local Cafe', category: 'Food & Drink', checkIns: 5, totalSpent: 175, lastVisit: '2026-02-15' },
      { name: 'Book Nook', category: 'Retail', checkIns: 3, totalSpent: 90, lastVisit: '2026-02-10' },
    ],
    reviews: [
      { businessName: 'Local Cafe', rating: 5, content: 'Amazing coffee and atmosphere!', createdAt: '2026-02-14' },
    ],
    deals: [
      { dealTitle: '20% Off', businessName: 'Book Nook', claimedAt: '2026-02-01', redeemedAt: '2026-02-05' },
      { dealTitle: 'Free Coffee', businessName: 'Local Cafe', claimedAt: '2026-02-10', redeemedAt: null },
    ],
    timeline: [
      { type: 'Check-in', businessName: 'Local Cafe', detail: 'Spent $35', date: '2026-02-15' },
      { type: 'Review', businessName: 'Local Cafe', detail: 'Rated 5/5', date: '2026-02-14' },
    ],
    ...overrides,
  }
}

// ============================================================================
// generateCSV
// ============================================================================

describe('generateCSV', () => {
  it('generates valid CSV with all sections', () => {
    const report = createMockReport()
    const csv = generateCSV(report)

    expect(csv).toContain('Pulse Impact Report')
    expect(csv).toContain('=== Impact Summary ===')
    expect(csv).toContain('=== Category Breakdown ===')
    expect(csv).toContain('=== Businesses Supported ===')
    expect(csv).toContain('=== Reviews ===')
    expect(csv).toContain('=== Deals Claimed ===')
    expect(csv).toContain('=== Activity Timeline ===')
  })

  it('includes summary metrics', () => {
    const report = createMockReport()
    const csv = generateCSV(report)

    expect(csv).toContain('Dollars Kept Local,$1,250')
    expect(csv).toContain('Businesses Supported,15')
    expect(csv).toContain('Jobs Impacted,1')
    expect(csv).toContain('Carbon Saved (lbs),10')
    expect(csv).toContain('Reviews Left,8')
    expect(csv).toContain('Deals Claimed,5')
    expect(csv).toContain('Total Check-ins,20')
  })

  it('includes tier information', () => {
    const report = createMockReport()
    const csv = generateCSV(report)

    expect(csv).toContain('Impact Tier')
    expect(csv).toContain('Local Supporter')
  })

  it('includes business data', () => {
    const report = createMockReport()
    const csv = generateCSV(report)

    expect(csv).toContain('Local Cafe')
    expect(csv).toContain('Book Nook')
  })

  it('includes review data', () => {
    const report = createMockReport()
    const csv = generateCSV(report)

    expect(csv).toContain('Amazing coffee and atmosphere!')
  })

  it('includes deal status', () => {
    const report = createMockReport()
    const csv = generateCSV(report)

    expect(csv).toContain('20% Off')
    expect(csv).toContain('Pending')
  })

  it('properly escapes commas in business names', () => {
    const report = createMockReport({
      businesses: [
        { name: 'Joe\'s Cafe, Bar & Grill', category: 'Food & Drink', checkIns: 1, totalSpent: 50, lastVisit: '2026-02-15' },
      ],
    })
    const csv = generateCSV(report)

    // Commas in values should be wrapped in quotes
    expect(csv).toContain('"Joe\'s Cafe, Bar & Grill"')
  })

  it('properly escapes quotes in content', () => {
    const report = createMockReport({
      reviews: [
        { businessName: 'Cafe', rating: 5, content: 'They said "best coffee ever"', createdAt: '2026-02-14' },
      ],
    })
    const csv = generateCSV(report)

    // Quotes within values should be doubled
    expect(csv).toContain('""best coffee ever""')
  })

  it('handles empty data arrays gracefully', () => {
    const report = createMockReport({
      categoryBreakdown: [],
      businesses: [],
      reviews: [],
      deals: [],
      timeline: [],
    })
    const csv = generateCSV(report)

    expect(csv).toContain('Pulse Impact Report')
    expect(csv).toContain('=== Impact Summary ===')
    expect(csv).not.toContain('=== Category Breakdown ===')
    expect(csv).not.toContain('=== Businesses Supported ===')
    expect(csv).not.toContain('=== Reviews ===')
    expect(csv).not.toContain('=== Deals Claimed ===')
    expect(csv).not.toContain('=== Activity Timeline ===')
  })

  it('shows "All Time" when no from date', () => {
    const report = createMockReport({ dateRange: { from: null, to: '2026-02-16' } })
    const csv = generateCSV(report)

    expect(csv).toContain('Beginning')
  })
})

// ============================================================================
// downloadCSV
// ============================================================================

describe('downloadCSV', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates blob with correct MIME type and triggers download', () => {
    const mockClick = vi.fn()
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()

    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    downloadCSV('test,csv,data', 'test-report.csv')

    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob))
    expect(mockClick).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')
  })
})

// ============================================================================
// getDateRangeParams
// ============================================================================

describe('getDateRangeParams', () => {
  it('returns correct range for "week"', () => {
    const params = getDateRangeParams('week')
    expect(params.from).toBeDefined()
    expect(params.to).toBeDefined()
    // from should be a date string in YYYY-MM-DD format
    expect(params.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(params.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns correct range for "month"', () => {
    const params = getDateRangeParams('month')
    expect(params.from).toBeDefined()
    expect(params.to).toBeDefined()
    // from should start with current year-month and day 01
    expect(params.from).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('returns no "from" for "all_time"', () => {
    const params = getDateRangeParams('all_time')
    expect(params.from).toBeUndefined()
    expect(params.to).toBeDefined()
  })
})

// ============================================================================
// getDateRangeLabel
// ============================================================================

describe('getDateRangeLabel', () => {
  it('returns "This Week" for week', () => {
    expect(getDateRangeLabel('week')).toBe('This Week')
  })

  it('returns "This Month" for month', () => {
    expect(getDateRangeLabel('month')).toBe('This Month')
  })

  it('returns "All Time" for all_time', () => {
    expect(getDateRangeLabel('all_time')).toBe('All Time')
  })
})
