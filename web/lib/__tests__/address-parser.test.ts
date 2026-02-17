import { describe, it, expect } from 'vitest'
import {
  parseAddressComponents,
  normalizeState,
  formatDisplayAddress,
  isUSAddress,
  type ParsedAddress,
} from '../address-parser'

describe('parseAddressComponents', () => {
  it('parses standard US address with zip', () => {
    const result = parseAddressComponents('123 Main St, Springfield, IL 62701, USA')

    expect(result.street).toBe('123 Main St')
    expect(result.city).toBe('Springfield')
    expect(result.state).toBe('IL')
    expect(result.zipCode).toBe('62701')
    expect(result.country).toBe('USA')
  })

  it('parses address with full state name', () => {
    const result = parseAddressComponents('456 Oak Ave, Springfield, Illinois 62701')

    expect(result.street).toBe('456 Oak Ave')
    expect(result.city).toBe('Springfield')
    expect(result.state).toBe('Illinois')
    expect(result.zipCode).toBe('62701')
    expect(result.country).toBe('USA')
  })

  it('parses address without country', () => {
    const result = parseAddressComponents('789 Pine Road, San Francisco, CA 94102')

    expect(result.street).toBe('789 Pine Road')
    expect(result.city).toBe('San Francisco')
    expect(result.state).toBe('CA')
    expect(result.zipCode).toBe('94102')
  })

  it('parses address with zip+4', () => {
    const result = parseAddressComponents('100 Broadway, New York, NY 10001-1234, USA')

    expect(result.street).toBe('100 Broadway')
    expect(result.city).toBe('New York')
    expect(result.state).toBe('NY')
    expect(result.zipCode).toBe('10001-1234')
  })

  it('parses address with apartment number', () => {
    const result = parseAddressComponents('500 Main St, Apt 2B, Boston, MA 02101, USA')

    expect(result.street).toBe('500 Main St, Apt 2B')
    expect(result.city).toBe('Boston')
    expect(result.state).toBe('MA')
    expect(result.zipCode).toBe('02101')
  })

  it('handles empty string', () => {
    const result = parseAddressComponents('')

    expect(result.street).toBe('')
    expect(result.city).toBe('')
    expect(result.state).toBe('')
    expect(result.zipCode).toBe('')
  })

  it('handles single part address', () => {
    const result = parseAddressComponents('Some Place')

    expect(result.street).toBe('Some Place')
    expect(result.city).toBe('')
    expect(result.state).toBe('')
    expect(result.zipCode).toBe('')
  })

  it('handles two part address', () => {
    const result = parseAddressComponents('Some Place, Chicago')

    expect(result.street).toBe('Some Place')
    expect(result.city).toBe('Chicago')
    expect(result.state).toBe('')
    expect(result.zipCode).toBe('')
  })

  it('handles two part address with state and zip', () => {
    const result = parseAddressComponents('123 Main St, Springfield IL 62701')

    expect(result.street).toBe('123 Main St')
    expect(result.city).toBe('Springfield')
    expect(result.state).toBe('IL')
    expect(result.zipCode).toBe('62701')
  })

  it('parses Canadian address', () => {
    const result = parseAddressComponents('100 Queen St, Toronto, ON M5H 2N2, Canada')

    expect(result.street).toBe('100 Queen St')
    expect(result.city).toBe('Toronto')
    expect(result.state).toBe('ON')
    expect(result.country).toBe('Canada')
  })
})

describe('normalizeState', () => {
  it('returns abbreviation for full state name', () => {
    expect(normalizeState('california')).toBe('CA')
    expect(normalizeState('New York')).toBe('NY')
    expect(normalizeState('TEXAS')).toBe('TX')
  })

  it('returns uppercase for existing abbreviations', () => {
    expect(normalizeState('ca')).toBe('CA')
    expect(normalizeState('NY')).toBe('NY')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeState('')).toBe('')
  })

  it('returns uppercase for unknown states', () => {
    expect(normalizeState('Unknown')).toBe('UNKNOWN')
  })
})

describe('formatDisplayAddress', () => {
  it('formats city and state', () => {
    const address: ParsedAddress = {
      street: '123 Main St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
    }

    expect(formatDisplayAddress(address)).toBe('Chicago, IL')
  })

  it('returns empty string for empty address', () => {
    const address: ParsedAddress = {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    }

    expect(formatDisplayAddress(address)).toBe('')
  })
})

describe('isUSAddress', () => {
  it('returns true for USA country', () => {
    const address: ParsedAddress = {
      street: '',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
    }

    expect(isUSAddress(address)).toBe(true)
  })

  it('returns true for valid state abbreviation', () => {
    const address: ParsedAddress = {
      street: '',
      city: 'Austin',
      state: 'TX',
      zipCode: '',
      country: '',
    }

    expect(isUSAddress(address)).toBe(true)
  })

  it('returns true for full state name', () => {
    const address: ParsedAddress = {
      street: '',
      city: 'Boston',
      state: 'Massachusetts',
      zipCode: '',
      country: '',
    }

    expect(isUSAddress(address)).toBe(true)
  })

  it('returns false for Canadian address', () => {
    const address: ParsedAddress = {
      street: '',
      city: 'Toronto',
      state: 'ON',
      zipCode: '',
      country: 'Canada',
    }

    expect(isUSAddress(address)).toBe(false)
  })
})
