import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationPrompt } from '../LocationPrompt'

// LocationSearchBox calls into the location lib on type; stub it so the prompt
// renders without hitting the network.
vi.mock('@/lib/location', () => ({
  getLocationSuggestions: vi.fn(async () => []),
  resolveLocationByPlaceId: vi.fn(async () => null),
  geocodeZipCode: vi.fn(async () => null),
}))

// Fix for matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('LocationPrompt', () => {
  const mockOnAllowLocation = vi.fn()
  const mockOnSelectLocation = vi.fn()

  function renderPrompt(props: Partial<React.ComponentProps<typeof LocationPrompt>> = {}) {
    return render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSelectLocation={mockOnSelectLocation}
        permission="prompt"
        isLoading={false}
        {...props}
      />
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders location prompt heading', () => {
    renderPrompt()
    expect(screen.getByText('Find Businesses Near You')).toBeInTheDocument()
  })

  it('calls onAllowLocation when allow button is clicked', () => {
    renderPrompt()
    fireEvent.click(screen.getByText('Allow Location Access'))
    expect(mockOnAllowLocation).toHaveBeenCalled()
  })

  it('shows loading state when isLoading is true', () => {
    renderPrompt({ isLoading: true })
    expect(screen.getByText('Getting location...')).toBeInTheDocument()
  })

  it('shows denied state when permission is denied', () => {
    renderPrompt({ permission: 'denied' })
    expect(screen.getByText('Location Access Denied')).toBeInTheDocument()
    expect(screen.getByText(/Please enable location access/)).toBeInTheDocument()
  })

  it('renders the city/zip search box', () => {
    renderPrompt()
    expect(
      screen.getByPlaceholderText('Search city or zip code')
    ).toBeInTheDocument()
  })

  it('lets the user type into the search box', () => {
    renderPrompt()
    const input = screen.getByPlaceholderText('Search city or zip code')
    fireEvent.change(input, { target: { value: 'San Antonio' } })
    expect(input).toHaveValue('San Antonio')
  })

  it('shows browser settings instructions when denied', () => {
    renderPrompt({ permission: 'denied' })
    expect(screen.getByText(/Click the lock\/info icon/)).toBeInTheDocument()
    expect(screen.getByText(/Find "Location" permissions/)).toBeInTheDocument()
  })
})
