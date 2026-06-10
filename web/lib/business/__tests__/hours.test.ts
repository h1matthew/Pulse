import { describe, expect, it } from 'vitest'
import { isOpenNow } from '../hours'

// June 2026 (local time): Mon Jun 8, Tue Jun 9, Wed Jun 10, Thu Jun 11,
// Fri Jun 12, Sat Jun 13, Sun Jun 14, Mon Jun 15.
// All `now` values are explicit fixed dates — never wall-clock dependent.
const at = (iso: string) => new Date(iso)

const WEEK = [
  'Monday: 9:00 AM – 5:00 PM', // en-dash
  'Tuesday: Closed',
  'Wednesday: 9:00 AM – 12:00 AM', // closes at midnight
  'Thursday: 11:00 AM – 2:00 PM, 5:00 PM – 9:00 PM', // split ranges
  'Friday: 5:00 PM – 2:00 AM', // overnight, bleeds into Saturday
  'Saturday: 10:00 AM - 5:00 PM', // plain hyphen
  'Sunday: Open 24 hours',
]

describe('isOpenNow', () => {
  describe('standard day ranges', () => {
    it('returns true inside opening hours', () => {
      expect(isOpenNow(WEEK, at('2026-06-08T10:00:00'))).toBe(true) // Mon 10:00
      expect(isOpenNow(WEEK, at('2026-06-08T09:00:00'))).toBe(true) // Mon at open
      expect(isOpenNow(WEEK, at('2026-06-08T16:59:00'))).toBe(true) // Mon just before close
    })

    it('returns false outside opening hours', () => {
      expect(isOpenNow(WEEK, at('2026-06-08T08:59:00'))).toBe(false) // Mon before open
      expect(isOpenNow(WEEK, at('2026-06-08T17:00:00'))).toBe(false) // Mon at close (exclusive)
      expect(isOpenNow(WEEK, at('2026-06-08T22:00:00'))).toBe(false) // Mon late evening
    })

    it('parses plain hyphen separators', () => {
      expect(isOpenNow(WEEK, at('2026-06-13T11:00:00'))).toBe(true) // Sat 11:00
      expect(isOpenNow(WEEK, at('2026-06-13T18:00:00'))).toBe(false) // Sat after close
    })

    it('parses en-dash without surrounding spaces', () => {
      const hours = ['Monday: 9:00 AM–5:00 PM']
      expect(isOpenNow(hours, at('2026-06-08T12:00:00'))).toBe(true)
      expect(isOpenNow(hours, at('2026-06-08T18:00:00'))).toBe(false)
    })

    it('parses narrow no-break and thin spaces (Google formatting)', () => {
      const hours = ['Monday: 9:00\u202FAM\u2009\u2013\u20095:00\u202FPM']
      expect(isOpenNow(hours, at('2026-06-08T12:00:00'))).toBe(true)
      expect(isOpenNow(hours, at('2026-06-08T18:00:00'))).toBe(false)
    })

    it('parses times without minutes', () => {
      const hours = ['Monday: 9 AM - 5 PM']
      expect(isOpenNow(hours, at('2026-06-08T10:00:00'))).toBe(true)
      expect(isOpenNow(hours, at('2026-06-08T08:00:00'))).toBe(false)
    })
  })

  describe('closed days', () => {
    it('returns false on a "Closed" day', () => {
      expect(isOpenNow(WEEK, at('2026-06-09T12:00:00'))).toBe(false) // Tue noon
      expect(isOpenNow(WEEK, at('2026-06-09T00:30:00'))).toBe(false) // Tue just after midnight (Mon closed 5 PM)
    })
  })

  describe('open 24 hours', () => {
    it('returns true at any time of a 24-hour day', () => {
      expect(isOpenNow(WEEK, at('2026-06-14T00:00:00'))).toBe(true) // Sun midnight
      expect(isOpenNow(WEEK, at('2026-06-14T03:00:00'))).toBe(true) // Sun 3 AM
      expect(isOpenNow(WEEK, at('2026-06-14T23:59:00'))).toBe(true) // Sun 11:59 PM
    })

    it('does not bleed a 24-hour day into the next day', () => {
      expect(isOpenNow(WEEK, at('2026-06-15T00:30:00'))).toBe(false) // Mon 00:30 (opens 9 AM)
    })
  })

  describe('multiple comma-separated ranges', () => {
    it('returns true inside either range', () => {
      expect(isOpenNow(WEEK, at('2026-06-11T12:00:00'))).toBe(true) // Thu lunch
      expect(isOpenNow(WEEK, at('2026-06-11T18:00:00'))).toBe(true) // Thu dinner
    })

    it('returns false in the gap between ranges', () => {
      expect(isOpenNow(WEEK, at('2026-06-11T15:00:00'))).toBe(false) // Thu 3 PM
      expect(isOpenNow(WEEK, at('2026-06-11T21:30:00'))).toBe(false) // Thu after close
    })
  })

  describe('overnight spans', () => {
    it('handles a span ending exactly at midnight (12:00 AM)', () => {
      expect(isOpenNow(WEEK, at('2026-06-10T23:30:00'))).toBe(true) // Wed 11:30 PM
      expect(isOpenNow(WEEK, at('2026-06-11T00:30:00'))).toBe(false) // Thu 00:30 — Wed closed at midnight
    })

    it('handles a span bleeding past midnight into the next day', () => {
      expect(isOpenNow(WEEK, at('2026-06-12T18:00:00'))).toBe(true) // Fri 6 PM
      expect(isOpenNow(WEEK, at('2026-06-12T23:59:00'))).toBe(true) // Fri 11:59 PM
      expect(isOpenNow(WEEK, at('2026-06-13T01:00:00'))).toBe(true) // Sat 1 AM via Friday overnight
      expect(isOpenNow(WEEK, at('2026-06-13T01:59:00'))).toBe(true) // Sat 1:59 AM
      expect(isOpenNow(WEEK, at('2026-06-13T02:00:00'))).toBe(false) // Sat 2 AM — overnight ended
      expect(isOpenNow(WEEK, at('2026-06-13T03:00:00'))).toBe(false) // Sat 3 AM — before Sat open
    })

    it('returns false before an overnight span starts', () => {
      expect(isOpenNow(WEEK, at('2026-06-12T12:00:00'))).toBe(false) // Fri noon (opens 5 PM)
    })
  })

  describe('object-form hours', () => {
    it('supports a { monday: "..." } shape', () => {
      const hours = { monday: '9:00 AM – 5:00 PM', tuesday: 'Closed' }
      expect(isOpenNow(hours, at('2026-06-08T10:00:00'))).toBe(true) // Mon 10 AM
      expect(isOpenNow(hours, at('2026-06-08T20:00:00'))).toBe(false) // Mon 8 PM
      expect(isOpenNow(hours, at('2026-06-09T12:00:00'))).toBe(false) // Tue Closed
    })

    it('returns null for days missing from the object', () => {
      const hours = { monday: '9:00 AM – 5:00 PM' }
      expect(isOpenNow(hours, at('2026-06-10T12:00:00'))).toBe(null) // Wed unknown
    })
  })

  describe('unknown / unparseable input returns null', () => {
    it.each([
      ['empty array', []],
      ['empty object', {}],
      ['null', null],
      ['undefined', undefined],
      ['a string', 'Monday: 9:00 AM – 5:00 PM'],
      ['a number', 42],
      ['a boolean', true],
      ['array of non-strings', [1, 2, 3]],
      ['array of garbage strings', ['lol', 'not hours']],
      ['array with unparseable times', ['Monday: whenever we feel like it']],
      ['object with non-day keys', { brunch: '9:00 AM – 2:00 PM' }],
      ['object with non-string values', { monday: 123 }],
    ])('returns null for %s', (_label, hours) => {
      expect(isOpenNow(hours, at('2026-06-08T12:00:00'))).toBe(null)
    })

    it('returns null when today is missing from an otherwise valid array', () => {
      const hours = ['Tuesday: 9:00 AM – 5:00 PM']
      expect(isOpenNow(hours, at('2026-06-08T12:00:00'))).toBe(null) // Monday unknown
    })

    it('skips garbage entries but still uses valid ones', () => {
      const hours = ['garbage', 42 as unknown as string, 'Monday: 9:00 AM – 5:00 PM']
      expect(isOpenNow(hours, at('2026-06-08T12:00:00'))).toBe(true)
      expect(isOpenNow(hours, at('2026-06-08T20:00:00'))).toBe(false)
    })

    it('returns null for an invalid now date', () => {
      expect(isOpenNow(WEEK, new Date('invalid'))).toBe(null)
    })

    it('never throws on adversarial input', () => {
      const inputs: unknown[] = [
        Symbol('hours'),
        () => WEEK,
        [{ monday: 'nope' }],
        [''],
        ['Monday:'],
        ['Monday: 99:99 AM – 5:00 PM'],
        new Date(),
      ]
      for (const input of inputs) {
        expect(() => isOpenNow(input, at('2026-06-08T12:00:00'))).not.toThrow()
      }
    })
  })

  describe('default now parameter', () => {
    it('works without an explicit now (full week is always determinable)', () => {
      // Every day of WEEK is known, so the result is always a boolean
      // regardless of when the test runs.
      expect(typeof isOpenNow(WEEK)).toBe('boolean')
    })
  })
})
