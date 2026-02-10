import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('MobileMenu NAV_ITEMS', () => {
  it('has correct navigation items for public and logged-in users', () => {
    const file = path.join(__dirname, '..', 'MobileMenu.tsx')
    const content = fs.readFileSync(file, 'utf-8')

    // Verify public nav items
    expect(content).toContain("label: 'About'")
    expect(content).toContain("label: 'Our Mission'")
    expect(content).toContain("label: 'Get Involved'")

    // Verify logged-in nav items include Dashboard
    expect(content).toContain("label: 'Dashboard'")
    expect(content).toContain("href: '/dashboard'")
  })

  it('does not have Flashcards as a separate nav item', () => {
    const file = path.join(__dirname, '..', 'MobileMenu.tsx')
    const content = fs.readFileSync(file, 'utf-8')

    expect(content).not.toMatch(/label:\s*'Flashcards'/)
  })
})
