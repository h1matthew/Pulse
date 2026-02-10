import { NextResponse } from 'next/server'
import { isValidUUID, isWithinLength } from '@/lib/validation'

/**
 * Validate a UUID parameter and return error response if invalid.
 * Returns null if valid.
 *
 * @param value - The value to validate
 * @param paramName - Name of the parameter for error message
 * @returns NextResponse with 400 status if invalid, null otherwise
 *
 * @example
 * const { id } = await params
 * const uuidError = validateUUIDParam(id, 'conversation ID')
 * if (uuidError) return uuidError
 */
export function validateUUIDParam(value: string, paramName: string): NextResponse | null {
  if (!isValidUUID(value)) {
    return NextResponse.json(
      { error: `Invalid ${paramName}. Must be a valid UUID.` },
      { status: 400 }
    )
  }
  return null
}

/**
 * Validate an optional UUID parameter.
 * Returns null if the value is null/undefined or is a valid UUID.
 * Returns error response only if value is present but invalid.
 *
 * @param value - The value to validate (can be null/undefined)
 * @param paramName - Name of the parameter for error message
 * @returns NextResponse with 400 status if invalid, null otherwise
 */
export function validateOptionalUUID(
  value: string | null | undefined,
  paramName: string
): NextResponse | null {
  if (value === null || value === undefined) return null
  return validateUUIDParam(value, paramName)
}

/**
 * Validate string length and return error response if invalid.
 * Returns null if valid.
 *
 * @param value - The string to validate
 * @param maxLength - Maximum allowed length
 * @param paramName - Name of the parameter for error message
 * @param minLength - Minimum allowed length (default: 0)
 * @returns NextResponse with 400 status if invalid, null otherwise
 */
export function validateStringLength(
  value: string,
  maxLength: number,
  paramName: string,
  minLength = 0
): NextResponse | null {
  if (!isWithinLength(value, maxLength, minLength)) {
    if (minLength > 0 && value.length < minLength) {
      return NextResponse.json(
        { error: `${paramName} must be at least ${minLength} characters.` },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: `${paramName} must be ${maxLength} characters or less.` },
      { status: 400 }
    )
  }
  return null
}

/**
 * Validate required string field.
 * Returns error if the value is missing, not a string, or empty.
 *
 * @param value - The value to validate
 * @param paramName - Name of the parameter for error message
 * @returns NextResponse with 400 status if invalid, null otherwise
 */
export function validateRequiredString(
  value: unknown,
  paramName: string
): NextResponse | null {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return NextResponse.json(
      { error: `${paramName} is required and must be a non-empty string.` },
      { status: 400 }
    )
  }
  return null
}

/**
 * Validate an array of UUIDs.
 * Returns error if the array is empty or contains invalid UUIDs.
 *
 * @param values - Array of values to validate
 * @param paramName - Name of the parameter for error message
 * @returns NextResponse with 400 status if invalid, null otherwise
 */
export function validateUUIDArray(
  values: unknown[],
  paramName: string
): NextResponse | null {
  if (!Array.isArray(values) || values.length === 0) {
    return NextResponse.json(
      { error: `${paramName} must be a non-empty array.` },
      { status: 400 }
    )
  }

  for (const value of values) {
    if (typeof value !== 'string' || !isValidUUID(value)) {
      return NextResponse.json(
        { error: `${paramName} contains invalid UUID(s).` },
        { status: 400 }
      )
    }
  }

  return null
}

/**
 * Validate enum value.
 * Returns error if the value is not in the allowed values.
 *
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param paramName - Name of the parameter for error message
 * @returns NextResponse with 400 status if invalid, null otherwise
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  paramName: string
): NextResponse | null {
  if (!allowedValues.includes(value as T)) {
    return NextResponse.json(
      { error: `${paramName} must be one of: ${allowedValues.join(', ')}.` },
      { status: 400 }
    )
  }
  return null
}

/**
 * Validate integer within bounds.
 * Returns error if the value is not an integer or outside bounds.
 *
 * @param value - The value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param paramName - Name of the parameter for error message
 * @returns NextResponse with 400 status if invalid, null otherwise
 */
export function validateIntegerBounds(
  value: unknown,
  min: number,
  max: number,
  paramName: string
): NextResponse | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return NextResponse.json(
      { error: `${paramName} must be an integer.` },
      { status: 400 }
    )
  }

  if (value < min || value > max) {
    return NextResponse.json(
      { error: `${paramName} must be between ${min} and ${max}.` },
      { status: 400 }
    )
  }

  return null
}
