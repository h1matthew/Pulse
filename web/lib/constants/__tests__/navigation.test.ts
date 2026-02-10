import { describe, it, expect } from 'vitest'
import { SIDEBAR_NAVIGATION } from '../navigation'

describe('Sidebar Navigation', () => {
  it('Practice section has Practice link, not Flashcards', () => {
    const practiceSection = SIDEBAR_NAVIGATION.find((s) => s.title === 'Practice')
    const practiceItem = practiceSection?.items.find((i) => i.href === '/practice')

    expect(practiceItem?.label).toBe('Practice')
    expect(practiceItem?.label).not.toBe('Flashcards')
  })

  it('no item labeled Flashcards exists', () => {
    const allLabels = SIDEBAR_NAVIGATION.flatMap((s) => s.items.map((i) => i.label))
    expect(allLabels).not.toContain('Flashcards')
  })
})
