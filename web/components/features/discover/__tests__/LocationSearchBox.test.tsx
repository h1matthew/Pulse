import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LocationSearchBox } from '../LocationSearchBox'
import {
  getLocationSuggestions,
  resolveLocationByPlaceId,
  geocodeZipCode,
} from '@/lib/location'

vi.mock('@/lib/location', () => ({
  getLocationSuggestions: vi.fn(),
  resolveLocationByPlaceId: vi.fn(),
  geocodeZipCode: vi.fn(),
}))

const mockGetSuggestions = vi.mocked(getLocationSuggestions)
const mockResolve = vi.mocked(resolveLocationByPlaceId)
const mockGeocodeZip = vi.mocked(geocodeZipCode)

describe('LocationSearchBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSuggestions.mockResolvedValue([])
    mockResolve.mockResolvedValue(null)
    mockGeocodeZip.mockResolvedValue(null)
  })

  it('renders an accessible combobox input', () => {
    render(<LocationSearchBox onSelect={vi.fn()} />)
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows debounced suggestions while typing', async () => {
    mockGetSuggestions.mockResolvedValue([
      { id: 'p1', label: 'San Antonio, TX, USA' },
      { id: 'p2', label: 'Austin, TX, USA' },
    ])

    render(<LocationSearchBox onSelect={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'san anto' } })

    await waitFor(() => {
      expect(screen.getByText('San Antonio, TX, USA')).toBeInTheDocument()
    })
    expect(mockGetSuggestions).toHaveBeenCalledWith('san anto')
  })

  it('does not query for queries shorter than two characters', async () => {
    render(<LocationSearchBox onSelect={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } })
    // Give the debounce a chance to (not) fire.
    await new Promise((r) => setTimeout(r, 300))
    expect(mockGetSuggestions).not.toHaveBeenCalled()
  })

  it('resolves and emits the chosen suggestion', async () => {
    mockGetSuggestions.mockResolvedValue([{ id: 'p1', label: 'San Antonio, TX, USA' }])
    mockResolve.mockResolvedValue({
      location: { lat: 29.4252, lng: -98.4946 },
      label: 'San Antonio, TX',
    })
    const onSelect = vi.fn()

    render(<LocationSearchBox onSelect={onSelect} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'san anto' } })

    const option = await screen.findByText('San Antonio, TX, USA')
    fireEvent.mouseDown(option)

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        location: { lat: 29.4252, lng: -98.4946 },
        label: 'San Antonio, TX, USA',
      })
    })
    expect(mockResolve).toHaveBeenCalledWith('p1')
  })

  it('geocodes a bare zip code on Enter when no suggestion is highlighted', async () => {
    mockGetSuggestions.mockResolvedValue([])
    mockGeocodeZip.mockResolvedValue({ lat: 29.42, lng: -98.49 })
    const onSelect = vi.fn()

    render(<LocationSearchBox onSelect={onSelect} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: '78205' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        location: { lat: 29.42, lng: -98.49 },
        label: '78205',
      })
    })
    expect(mockGeocodeZip).toHaveBeenCalledWith('78205')
  })
})
