import { describe, it, expect } from 'vitest'
import { SIDEBAR_NAVIGATION } from '../navigation'

describe('Sidebar Navigation', () => {
  it('Engage section has Boost Missions link', () => {
    const engageSection = SIDEBAR_NAVIGATION.find((s) => s.title === 'Engage')
    const missionsItem = engageSection?.items.find((i) => i.href === '/missions')

    expect(missionsItem?.label).toBe('Boost Missions')
  })

  it('no item labeled Flashcards exists', () => {
    const allLabels = SIDEBAR_NAVIGATION.flatMap((s) => s.items.map((i) => i.label))
    expect(allLabels).not.toContain('Flashcards')
  })
})
