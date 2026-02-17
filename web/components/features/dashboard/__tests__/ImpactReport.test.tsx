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
  ],
  businesses: [
    { name: 'Local Cafe', category: 'Food & Drink', checkIns: 5, totalSpent: 175, lastVisit: '2026-02-15' },
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

  it('calls print function when Print Report button is clicked', () => {
    mockUseImpactReport.mockReturnValue({
      data: mockReport,
      isLoading: false,
      error: null,
    })

    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(<ImpactReportDialog {...defaultProps} />, {
      wrapper: createTestWrapper(),
    })

    fireEvent.click(screen.getByText('Print Report'))

    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
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
})
