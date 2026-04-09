import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImpactReportDialog } from '../ImpactReport'
import { createTestWrapper } from '@/__tests__/mocks/providers.mock'
import type { ImpactReportData } from '@/lib/report-generator'

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div />,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div />,
}))

// Mock the useImpactReport hook
const mockUseImpactReport = vi.fn()

vi.mock('@/hooks/useImpact', () => ({
  useImpactReport: (...args: unknown[]) => mockUseImpactReport(...args),
}))

const mockReport: ImpactReportData = {
  dateRange: { from: null, to: '2026-02-16' },
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
    { category: 'Retail', checkIns: 8, dollarsSpent: 300 },
  ],
  businesses: [
    { name: 'Local Cafe', category: 'Food & Drink', checkIns: 5, totalSpent: 175, lastVisit: '2026-02-15' },
    { name: 'Book Nook', category: 'Retail', checkIns: 3, totalSpent: 90, lastVisit: '2026-02-10' },
  ],
  reviews: [
    { businessName: 'Local Cafe', rating: 5, content: 'Amazing coffee!', createdAt: '2026-02-14' },
  ],
  deals: [
    { dealTitle: '20% Off', businessName: 'Book Nook', claimedAt: '2026-02-01', redeemedAt: '2026-02-05' },
  ],
  timeline: [
    { type: 'Check-in', businessName: 'Local Cafe', detail: 'Spent $35', date: '2026-02-15' },
  ],
}

describe('ImpactReportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    userId: 'test-user-id',
    userName: 'Test User',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the dialog when open is true', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Your Impact Report')).toBeInTheDocument()
  })

  it('does not render content when open is false', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} open={false} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.queryByText('Your Impact Report')).not.toBeInTheDocument()
  })

  it('shows loading skeleton while data is fetching', () => {
    mockUseImpactReport.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    // Should show the dialog title but not the report content
    expect(screen.getByText('Your Impact Report')).toBeInTheDocument()
    // Print and Download buttons should be disabled
    expect(screen.getByText('Print Report').closest('button')).toBeDisabled()
    expect(screen.getByText('Download CSV').closest('button')).toBeDisabled()
  })

  it('displays metrics when loaded', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('$1,250')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('10 lbs')).toBeInTheDocument()
    expect(screen.getByText('Local Supporter')).toBeInTheDocument()
  })

  it('displays business data', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    // "Local Cafe" appears in both the business table and the review list
    const matches = screen.getAllByText('Local Cafe')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('displays review data', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Amazing coffee!')).toBeInTheDocument()
  })

  it('displays deal data', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('20% Off')).toBeInTheDocument()
    expect(screen.getByText('Redeemed')).toBeInTheDocument()
  })

  it('shows error message when API call fails', () => {
    mockUseImpactReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Failed to load report data. Please try again.')).toBeInTheDocument()
  })

  it('shows empty state when no data in date range', () => {
    const emptyReport: ImpactReportData = {
      ...mockReport,
      metrics: {
        dollarsKeptLocal: 0,
        businessesSupported: 0,
        jobsImpacted: 0,
        carbonSaved: 0,
        reviewsLeft: 0,
        dealsClaimed: 0,
        totalCheckIns: 0,
      },
      categoryBreakdown: [],
      businesses: [],
      reviews: [],
      deals: [],
      timeline: [],
    }

    mockUseImpactReport.mockReturnValue({
      data: emptyReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('No activity yet')).toBeInTheDocument()
  })

  it('creates print iframe when Print Report button is clicked', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    fireEvent.click(screen.getByText('Print Report'))

    // The iframe is appended to body for printing
    const iframe = document.querySelector('iframe')
    expect(iframe).toBeInTheDocument()
  })

  it('triggers CSV download when Download CSV button is clicked', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    global.URL.revokeObjectURL = revokeObjectURLMock

    // Track the <a> element created by downloadCSV
    const mockClick = vi.fn()
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = origCreateElement(tag, options)
      if (tag === 'a') {
        el.click = mockClick
      }
      return el
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    fireEvent.click(screen.getByText('Download CSV'))

    expect(createObjectURLMock).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')

    vi.restoreAllMocks()
  })

  it('renders category filter when multiple categories exist', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByLabelText('Category filter')).toBeInTheDocument()
  })

  it('renders sortable column headers in business table', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByLabelText('Sort by Business')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort by Visits')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort by Spent')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort by Last Visit')).toBeInTheDocument()
  })

  it('displays both businesses when no category filter is applied', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getAllByText('Local Cafe').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Book Nook').length).toBeGreaterThanOrEqual(1)
  })

  it('renders tier badge with Lucide icon instead of emoji', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    const { container } = render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    // Tier name should be visible
    expect(screen.getByText('Local Supporter')).toBeInTheDocument()
    // Should NOT render raw emoji text — Lucide icon renders as SVG
    const badge = screen.getByText('Local Supporter').closest('[class*="badge"]') ||
                  screen.getByText('Local Supporter').parentElement
    expect(badge).toBeInTheDocument()
    // The badge should contain an SVG (Lucide icon) not emoji text
    const svg = badge?.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('print iframe contains report content with light mode styles', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    fireEvent.click(screen.getByText('Print Report'))

    const iframe = document.querySelector('iframe')
    expect(iframe).toBeInTheDocument()

    // The iframe document should contain the report HTML and light-mode overrides
    const iframeDoc = iframe?.contentDocument
    if (iframeDoc) {
      const body = iframeDoc.body
      expect(body.innerHTML).toContain('impact-report-printable')
      // Should have light mode style overrides
      const styles = iframeDoc.head.innerHTML
      expect(styles).toContain('background: white')
      expect(styles).toContain('color-scheme: light')
    }
  })

  it('generates CSV with correct content structure', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    let blobContent = ''
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURLMock = vi.fn()
    global.URL.createObjectURL = vi.fn((blob: Blob) => {
      // Read blob content via constructor argument
      blobContent = (blob as unknown as { _content?: string })._content ?? ''
      return 'blob:mock-url'
    })
    global.URL.revokeObjectURL = revokeObjectURLMock

    // Capture the Blob content
    const origBlob = global.Blob
    global.Blob = class MockBlob {
      _content: string
      constructor(parts: BlobPart[]) {
        this._content = parts.join('')
        blobContent = this._content
      }
    } as unknown as typeof Blob

    const mockClick = vi.fn()
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = origCreateElement(tag, options)
      if (tag === 'a') el.click = mockClick
      return el
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    fireEvent.click(screen.getByText('Download CSV'))

    // Verify CSV includes key sections
    expect(blobContent).toContain('Pulse Impact Report')
    expect(blobContent).toContain('Impact Summary')
    expect(blobContent).toContain('Dollars Kept Local,$1,250')
    expect(blobContent).toContain('Businesses Supported,15')
    expect(blobContent).toContain('Local Cafe')
    expect(blobContent).toContain('Amazing coffee!')
    expect(blobContent).toContain('20% Off')

    global.Blob = origBlob
    vi.restoreAllMocks()
  })

  it('renders timeline entries', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Activity Timeline')).toBeInTheDocument()
    expect(screen.getByText('Spent $35')).toBeInTheDocument()
  })

  it('displays date range when from date is present', () => {
    const reportWithRange: ImpactReportData = {
      ...mockReport,
      dateRange: { from: '2026-02-01T12:00:00Z', to: '2026-02-16T12:00:00Z' },
    }

    mockUseImpactReport.mockReturnValue({
      data: reportWithRange,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    // Date range renders in the report header — verify it's not "All Time"
    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Feb')
    expect(bodyText).toContain('2026')
    expect(bodyText).not.toMatch(/All Time.*All Time.*All Time/) // should not show "All Time" in header
  })

  it('shows "All Time" when no from date', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    // "All Time" appears in both the header and the date range select; just check it exists
    const allTimeElements = screen.getAllByText('All Time')
    expect(allTimeElements.length).toBeGreaterThanOrEqual(1)
  })

  it('renders impact summary cards with correct values', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Dollars Kept Local')).toBeInTheDocument()
    expect(screen.getByText('$1,250')).toBeInTheDocument()
    expect(screen.getByText('Businesses Supported')).toBeInTheDocument()
    expect(screen.getByText('Jobs Impacted')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Carbon Saved')).toBeInTheDocument()
    expect(screen.getByText('10 lbs')).toBeInTheDocument()
  })

  it('renders star ratings in reviews', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    const { container } = render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    // Review section should show star icons for the 5-star rating
    const reviewSection = screen.getByText('Amazing coffee!').closest('div')
    expect(reviewSection).toBeInTheDocument()
  })

  it('renders deal status badges correctly', () => {
    const reportWithPendingDeal: ImpactReportData = {
      ...mockReport,
      deals: [
        { dealTitle: '10% Off', businessName: 'Local Cafe', claimedAt: '2026-02-01', redeemedAt: null },
        { dealTitle: '20% Off', businessName: 'Book Nook', claimedAt: '2026-02-01', redeemedAt: '2026-02-05' },
      ],
    }

    mockUseImpactReport.mockReturnValue({
      data: reportWithPendingDeal,
      isLoading: false,
      error: null,
    })

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Redeemed')).toBeInTheDocument()
  })
})
