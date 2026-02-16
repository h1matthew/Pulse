/**
 * Address Parser Utility
 *
 * Parses Google Places formatted addresses into structured components.
 * Handles various US address formats.
 */

export interface ParsedAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

/**
 * Parse a formatted address string into components
 *
 * Supports formats like:
 * - "123 Main St, Springfield, IL 62701, USA"
 * - "123 Main St, Springfield, Illinois 62701"
 * - "456 Oak Ave, San Francisco, CA 94102"
 * - "789 Pine Road, New York, NY 10001-1234, United States"
 *
 * @param formattedAddress - Full address string from Google Places
 * @returns ParsedAddress with street, city, state, zipCode, country
 */
export function parseAddressComponents(formattedAddress: string): ParsedAddress {
  if (!formattedAddress) {
    return { street: '', city: '', state: '', zipCode: '', country: 'USA' }
  }

  const parts = formattedAddress.split(',').map(p => p.trim())

  // Default country
  let country = 'USA'

  // Check last part for country
  const lastPart = parts[parts.length - 1] || ''
  if (/^(USA?|United States|United States of America)$/i.test(lastPart)) {
    country = 'USA'
    parts.pop()
  } else if (/^(Canada|CAN)$/i.test(lastPart)) {
    country = 'Canada'
    parts.pop()
  }

  // Need at least 2 parts: "City, State ZIP" or "Street, City"
  if (parts.length < 2) {
    return {
      street: parts[0] || '',
      city: '',
      state: '',
      zipCode: '',
      country
    }
  }

  // With exactly 2 parts, assume it's "Street, City State ZIP" or just "City, State"
  if (parts.length === 2) {
    // Try to parse second part as "City State ZIP" combined
    const cityStateZipPart = parts[1]
    // Match patterns like "Springfield IL 62701", "Springfield Illinois 62701"
    const match = cityStateZipPart.match(/^([A-Za-z\s]+?)\s+([A-Za-z\.\s]+?)\s+(\d{5}(-\d{4})?)$/)
    if (match) {
      return {
        street: parts[0],
        city: match[1].trim(),
        state: match[2].trim(),
        zipCode: match[3],
        country
      }
    }

    // Just "City, State" or "City, State ZIP"
    const stateZipMatch = cityStateZipPart.match(/^([A-Za-z\s\.]+)\s+(\d{5}(-\d{4})?)$/)
    if (stateZipMatch) {
      return {
        street: parts[0],
        city: '',  // City was combined with state/zip
        state: stateZipMatch[1].trim(),
        zipCode: stateZipMatch[2],
        country
      }
    }

    // Just city name in second part
    return {
      street: parts[0],
      city: cityStateZipPart,
      state: '',
      zipCode: '',
      country
    }
  }

  // State and zip should be in the last part now
  const stateZipPart = parts.pop() || ''

  // Match patterns like "IL 62701", "Illinois 62701", "CA 94102-1234", "ON M5H 2N2" (Canada)
  const stateZipMatch = stateZipPart.match(/^([A-Za-z\s\.]+?)\s+(\d{5}(-\d{4})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d)$/i)

  let state = ''
  let zipCode = ''

  if (stateZipMatch) {
    state = stateZipMatch[1].trim()
    zipCode = stateZipMatch[2]
  } else {
    // Try just state or just zip
    if (/^\d{5}(-\d{4})?$/.test(stateZipPart)) {
      zipCode = stateZipPart
    } else if (/^[A-Z]{2}$/i.test(stateZipPart) || /^[A-Za-z\s]+$/.test(stateZipPart)) {
      state = stateZipPart
    } else {
      // Couldn't parse, put it back as city extension
      parts.push(stateZipPart)
    }
  }

  // City should be the last part now
  const city = parts.pop() || ''

  // Everything before city is the street address
  const street = parts.join(', ')

  return {
    street,
    city,
    state,
    zipCode,
    country
  }
}

/**
 * Normalize state name to abbreviation
 *
 * Converts full state names to 2-letter abbreviations
 * for consistent storage.
 */
const STATE_MAP: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
}

/**
 * Normalize state to 2-letter abbreviation
 */
export function normalizeState(state: string): string {
  if (!state) return ''

  // Already an abbreviation
  if (state.match(/^[A-Z]{2}$/i)) {
    return state.toUpperCase()
  }

  // Try to map full name to abbreviation
  const normalized = STATE_MAP[state.toLowerCase().trim()]
  return normalized || state.toUpperCase()
}

/**
 * Format address for display
 *
 * Creates a concise display string from parsed components
 */
export function formatDisplayAddress(address: ParsedAddress): string {
  const parts: string[] = []

  if (address.city) parts.push(address.city)
  if (address.state) parts.push(normalizeState(address.state))

  return parts.join(', ')
}

/**
 * Validate if an address appears to be in the US
 */
export function isUSAddress(address: ParsedAddress): boolean {
  if (address.country === 'USA') return true

  // Check if state is a valid US state
  if (address.state) {
    const stateUpper = address.state.toUpperCase()
    // Check if it's a 2-letter state code
    const stateCodes = Object.values(STATE_MAP)
    if (stateCodes.includes(stateUpper)) return true

    // Check if it's a full state name
    if (STATE_MAP[address.state.toLowerCase().trim()]) return true
  }

  return false
}
