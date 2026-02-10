// Formatting utilities for time, dates, and numbers

/**
 * Format seconds into a readable time string
 * @param seconds Total seconds
 * @returns Formatted string like "3h 24m" or "45s"
 */
export function formatTime(seconds: number | null): string {
  if (!seconds || seconds === 0) {
    return '0s'
  }

  if (seconds < 60) {
    return `${seconds}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }

  return `${secs}s`
}

/**
 * Format a date string to a relative time ago string
 * @param dateString ISO date string
 * @returns Formatted string like "2h ago" or "3d ago"
 */
export function formatTimeAgo(dateString: string | null): string {
  if (!dateString) {
    return 'Unknown'
  }

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) {
    return 'Just now'
  }

  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) {
    return 'Just now'
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`
  }

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  // For older dates, show the actual date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format accuracy as a percentage
 * @param accuracy Decimal accuracy (0.85 for 85%)
 * @returns Formatted string like "85%"
 */
export function formatAccuracy(accuracy: number | null): string {
  if (accuracy === null || accuracy === undefined) {
    return '0%'
  }

  return `${Math.round(accuracy)}%`
}

/**
 * Truncate text to a maximum length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.slice(0, maxLength).trim() + '...'
}
