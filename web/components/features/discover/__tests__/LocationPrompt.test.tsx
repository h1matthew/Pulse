import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LocationPrompt } from '../LocationPrompt'

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
  const mockOnSearchZip = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders location prompt heading', () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="prompt"
        isLoading={false}
      />
    )
    expect(screen.getByText('Find Businesses Near You')).toBeInTheDocument()
  })

  it('calls onAllowLocation when allow button is clicked', () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="prompt"
        isLoading={false}
      />
    )
    fireEvent.click(screen.getByText('Allow Location Access'))
    expect(mockOnAllowLocation).toHaveBeenCalled()
  })

  it('shows loading state when isLoading is true', () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="prompt"
        isLoading={true}
      />
    )
    expect(screen.getByText('Getting location...')).toBeInTheDocument()
  })

  it('shows denied state when permission is denied', () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="denied"
        isLoading={false}
      />
    )
    expect(screen.getByText('Location Access Denied')).toBeInTheDocument()
    expect(screen.getByText(/Please enable location access/)).toBeInTheDocument()
  })

  it('allows entering zip code', () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="prompt"
        isLoading={false}
      />
    )
    const input = screen.getByPlaceholderText('Enter zip code...')
    fireEvent.change(input, { target: { value: '12345' } })
    expect(input).toHaveValue('12345')
  })

  it('submits zip code search', async () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="prompt"
        isLoading={false}
      />
    )
    const input = screen.getByPlaceholderText('Enter zip code...')
    fireEvent.change(input, { target: { value: '12345' } })
    fireEvent.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => {
      expect(mockOnSearchZip).toHaveBeenCalledWith('12345')
    })
  })

  it('disables search button when zip code is empty', () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="prompt"
        isLoading={false}
      />
    )
    const searchButton = screen.getByRole('button', { name: /search/i })
    expect(searchButton).toBeDisabled()
  })

  it('shows browser settings instructions when denied', () => {
    render(
      <LocationPrompt
        onAllowLocation={mockOnAllowLocation}
        onSearchZip={mockOnSearchZip}
        permission="denied"
        isLoading={false}
      />
    )
    expect(screen.getByText(/Click the lock\/info icon/)).toBeInTheDocument()
    expect(screen.getByText(/Find "Location" permissions/)).toBeInTheDocument()
  })
})
