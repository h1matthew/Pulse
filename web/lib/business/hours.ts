// ============================================================================
// Business Hours Parsing
// Determines whether a business is currently open from the `hours` JSONB
// column — typically an array of Google weekday_text strings like
// "Monday: 9:00 AM – 12:00 AM". Defensive by design: returns null for
// anything unknown or unparseable, and never throws.
// ============================================================================

interface TimeRange {
  /** Minutes from midnight, inclusive. */
  start: number
  /** Minutes from midnight, exclusive. end <= start means the range wraps past midnight. */
  end: number
}

interface DaySchedule {
  /** True when the day's hours are determinable (including "Closed"). */
  known: boolean
  ranges: TimeRange[]
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sun: 0,
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  fri: 5,
  sat: 6,
}

const MINUTES_PER_DAY = 24 * 60

/** Normalize unicode spaces/dashes so Google-formatted strings parse cleanly. */
function normalizeSpec(value: string): string {
  return value
    .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse a single time token like "9:00 AM", "12 PM", or "17:30" into minutes from midnight. */
function parseTime(token: string): number | null {
  const match = token
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/)
  if (!match) return null

  const hour = Number(match[1])
  const minute = match[2] !== undefined ? Number(match[2]) : 0
  const meridiem = match[3]

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (minute < 0 || minute > 59) return null

  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    const base = hour % 12
    return (meridiem.startsWith('p') ? base + 12 : base) * 60 + minute
  }

  // 24-hour form (e.g. "17:30")
  if (hour < 0 || hour > 23) return null
  return hour * 60 + minute
}

/**
 * Parse the hours portion of a day spec (everything after "Monday:").
 * Handles "Closed", "Open 24 hours", and comma-separated ranges like
 * "11:00 AM - 2:00 PM, 5:00 PM - 9:00 PM".
 */
function parseDaySpec(spec: string): DaySchedule {
  const normalized = normalizeSpec(spec)
  if (normalized.length === 0) return { known: false, ranges: [] }

  if (/closed/i.test(normalized)) return { known: true, ranges: [] }
  if (/open\s*24\s*hours/i.test(normalized) || /^24\s*hours$/i.test(normalized)) {
    return { known: true, ranges: [{ start: 0, end: MINUTES_PER_DAY }] }
  }

  const ranges: TimeRange[] = []
  for (const part of normalized.split(',')) {
    const tokens = part.split(/\s*-\s*/)
    if (tokens.length !== 2) continue
    const start = parseTime(tokens[0])
    const end = parseTime(tokens[1])
    if (start === null || end === null) continue
    ranges.push({ start, end })
  }

  return { known: ranges.length > 0, ranges }
}

/** Extract the day index and remainder from a weekday_text entry like "Monday: 9:00 AM - 5:00 PM". */
function parseWeekdayLine(line: string): { day: number; spec: string } | null {
  const colonIndex = line.indexOf(':')
  if (colonIndex <= 0) return null
  const label = line.slice(0, colonIndex).trim().toLowerCase()
  const day = DAY_INDEX[label]
  if (day === undefined) return null
  return { day, spec: line.slice(colonIndex + 1) }
}

/** Build a day-indexed schedule map from whatever shape the DB hands us. */
function buildWeek(hours: unknown): Map<number, DaySchedule> | null {
  const week = new Map<number, DaySchedule>()

  if (Array.isArray(hours)) {
    for (const entry of hours) {
      if (typeof entry !== 'string') continue
      const parsed = parseWeekdayLine(normalizeSpec(entry))
      if (!parsed) continue
      const schedule = parseDaySpec(parsed.spec)
      if (schedule.known) week.set(parsed.day, schedule)
    }
  } else if (hours !== null && typeof hours === 'object') {
    // Object form: { monday: "9:00 AM - 5:00 PM", ... }
    for (const [key, value] of Object.entries(hours as Record<string, unknown>)) {
      if (typeof value !== 'string') continue
      const day = DAY_INDEX[key.trim().toLowerCase()]
      if (day === undefined) continue
      const schedule = parseDaySpec(value)
      if (schedule.known) week.set(day, schedule)
    }
  } else {
    return null
  }

  return week.size > 0 ? week : null
}

/** True when `minutes` falls inside the same-day portion of `range`. */
function coversSameDay(range: TimeRange, minutes: number): boolean {
  if (range.end > range.start) return minutes >= range.start && minutes < range.end
  // Wrapping (or zero-length, treated as 24h) range: covers start -> midnight today.
  return minutes >= range.start
}

/** True when `minutes` (early today) falls inside the spillover of yesterday's wrapping `range`. */
function coversOvernightSpill(range: TimeRange, minutes: number): boolean {
  if (range.end > range.start) return false
  return minutes < range.end
}

/**
 * Determine whether a business is open at a given moment.
 *
 * @param hours The raw `hours` value from the database. Typically an array of
 *   strings like "Monday: 9:00 AM – 12:00 AM" (en-dash or hyphen), possibly
 *   "Tuesday: Closed" or "Saturday: Open 24 hours". May be `{}`, `[]`, null,
 *   or arbitrary garbage.
 * @param now The moment to evaluate (local time). Defaults to the current time.
 * @returns true/false when determinable, null when unknown or unparseable.
 *   Never throws.
 */
export function isOpenNow(hours: unknown, now: Date = new Date()): boolean | null {
  try {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null

    const week = buildWeek(hours)
    if (!week) return null

    const day = now.getDay()
    const minutes = now.getHours() * 60 + now.getMinutes()

    const today = week.get(day)
    if (today) {
      for (const range of today.ranges) {
        if (coversSameDay(range, minutes)) return true
      }
    }

    const yesterday = week.get((day + 6) % 7)
    if (yesterday) {
      for (const range of yesterday.ranges) {
        if (coversOvernightSpill(range, minutes)) return true
      }
    }

    // Not inside any range: only a definite "closed" if today's hours are known.
    return today ? false : null
  } catch {
    return null
  }
}
