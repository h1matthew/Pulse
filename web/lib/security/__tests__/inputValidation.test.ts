import { describe, it, expect } from 'vitest'
import {
  validateUUIDParam,
  validateOptionalUUID,
  validateStringLength,
  validateRequiredString,
  validateUUIDArray,
  validateEnum,
  validateIntegerBounds,
} from '../inputValidation'

describe('validateUUIDParam', () => {
  it('returns null for valid UUID', () => {
    const result = validateUUIDParam('550e8400-e29b-41d4-a716-446655440000', 'testId')
    expect(result).toBeNull()
  })

  it('returns error response for invalid UUID', async () => {
    const result = validateUUIDParam('not-a-uuid', 'testId')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
    const body = await result?.json()
    expect(body.error).toContain('Invalid testId')
    expect(body.error).toContain('UUID')
  })

  it('returns error for empty string', async () => {
    const result = validateUUIDParam('', 'testId')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
  })

  it('uses custom param name in error message', async () => {
    const result = validateUUIDParam('invalid', 'conversation ID')
    const body = await result?.json()
    expect(body.error).toContain('conversation ID')
  })
})

describe('validateOptionalUUID', () => {
  it('returns null for valid UUID', () => {
    const result = validateOptionalUUID('550e8400-e29b-41d4-a716-446655440000', 'testId')
    expect(result).toBeNull()
  })

  it('returns null for null value', () => {
    const result = validateOptionalUUID(null, 'testId')
    expect(result).toBeNull()
  })

  it('returns null for undefined value', () => {
    const result = validateOptionalUUID(undefined, 'testId')
    expect(result).toBeNull()
  })

  it('returns error for invalid non-empty value', async () => {
    const result = validateOptionalUUID('invalid', 'testId')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
  })
})

describe('validateStringLength', () => {
  it('returns null for string within bounds', () => {
    const result = validateStringLength('hello', 10, 'message')
    expect(result).toBeNull()
  })

  it('returns null for string at exact max length', () => {
    const result = validateStringLength('hello', 5, 'message')
    expect(result).toBeNull()
  })

  it('returns error for string exceeding max length', async () => {
    const result = validateStringLength('hello world', 5, 'message')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
    const body = await result?.json()
    expect(body.error).toContain('5 characters or less')
  })

  it('returns error for string below min length', async () => {
    const result = validateStringLength('hi', 100, 'message', 5)
    expect(result).not.toBeNull()
    const body = await result?.json()
    expect(body.error).toContain('at least 5 characters')
  })

  it('handles empty string with no min length', () => {
    const result = validateStringLength('', 100, 'message')
    expect(result).toBeNull()
  })
})

describe('validateRequiredString', () => {
  it('returns null for valid non-empty string', () => {
    const result = validateRequiredString('hello', 'name')
    expect(result).toBeNull()
  })

  it('returns error for null value', async () => {
    const result = validateRequiredString(null, 'name')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
    const body = await result?.json()
    expect(body.error).toContain('name is required')
  })

  it('returns error for undefined value', async () => {
    const result = validateRequiredString(undefined, 'name')
    expect(result).not.toBeNull()
  })

  it('returns error for empty string', async () => {
    const result = validateRequiredString('', 'name')
    expect(result).not.toBeNull()
  })

  it('returns error for whitespace-only string', async () => {
    const result = validateRequiredString('   ', 'name')
    expect(result).not.toBeNull()
  })

  it('returns error for non-string types', async () => {
    expect(validateRequiredString(123, 'name')).not.toBeNull()
    expect(validateRequiredString({}, 'name')).not.toBeNull()
    expect(validateRequiredString([], 'name')).not.toBeNull()
  })
})

describe('validateUUIDArray', () => {
  it('returns null for valid UUID array', () => {
    const uuids = [
      '550e8400-e29b-41d4-a716-446655440000',
      '123e4567-e89b-12d3-a456-426614174000',
    ]
    const result = validateUUIDArray(uuids, 'ids')
    expect(result).toBeNull()
  })

  it('returns error for empty array', async () => {
    const result = validateUUIDArray([], 'ids')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
    const body = await result?.json()
    expect(body.error).toContain('non-empty array')
  })

  it('returns error for non-array', async () => {
    const result = validateUUIDArray('not-array' as unknown as unknown[], 'ids')
    expect(result).not.toBeNull()
  })

  it('returns error for array with invalid UUID', async () => {
    const uuids = ['550e8400-e29b-41d4-a716-446655440000', 'invalid']
    const result = validateUUIDArray(uuids, 'ids')
    expect(result).not.toBeNull()
    const body = await result?.json()
    expect(body.error).toContain('invalid UUID')
  })

  it('returns error for array with non-string elements', async () => {
    const values = ['550e8400-e29b-41d4-a716-446655440000', 123]
    const result = validateUUIDArray(values, 'ids')
    expect(result).not.toBeNull()
  })
})

describe('validateEnum', () => {
  const allowedValues = ['draft', 'published', 'archived'] as const

  it('returns null for valid enum value', () => {
    const result = validateEnum('draft', allowedValues, 'status')
    expect(result).toBeNull()
  })

  it('returns error for invalid enum value', async () => {
    const result = validateEnum('invalid', allowedValues, 'status')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
    const body = await result?.json()
    expect(body.error).toContain('must be one of')
    expect(body.error).toContain('draft')
    expect(body.error).toContain('published')
  })

  it('returns error for null value', async () => {
    const result = validateEnum(null, allowedValues, 'status')
    expect(result).not.toBeNull()
  })

  it('is case sensitive', async () => {
    const result = validateEnum('DRAFT', allowedValues, 'status')
    expect(result).not.toBeNull()
  })
})

describe('validateIntegerBounds', () => {
  it('returns null for integer within bounds', () => {
    const result = validateIntegerBounds(5, 1, 10, 'count')
    expect(result).toBeNull()
  })

  it('returns null for integer at min bound', () => {
    const result = validateIntegerBounds(1, 1, 10, 'count')
    expect(result).toBeNull()
  })

  it('returns null for integer at max bound', () => {
    const result = validateIntegerBounds(10, 1, 10, 'count')
    expect(result).toBeNull()
  })

  it('returns error for non-integer number', async () => {
    const result = validateIntegerBounds(5.5, 1, 10, 'count')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(400)
    const body = await result?.json()
    expect(body.error).toContain('must be an integer')
  })

  it('returns error for non-number types', async () => {
    expect(validateIntegerBounds('5' as unknown as number, 1, 10, 'count')).not.toBeNull()
    expect(validateIntegerBounds(null as unknown as number, 1, 10, 'count')).not.toBeNull()
    expect(validateIntegerBounds(undefined as unknown as number, 1, 10, 'count')).not.toBeNull()
  })

  it('returns error for value below min', async () => {
    const result = validateIntegerBounds(0, 1, 10, 'count')
    expect(result).not.toBeNull()
    const body = await result?.json()
    expect(body.error).toContain('between 1 and 10')
  })

  it('returns error for value above max', async () => {
    const result = validateIntegerBounds(11, 1, 10, 'count')
    expect(result).not.toBeNull()
    const body = await result?.json()
    expect(body.error).toContain('between 1 and 10')
  })

  it('handles negative bounds', () => {
    const result = validateIntegerBounds(-5, -10, 0, 'temperature')
    expect(result).toBeNull()
  })
})
