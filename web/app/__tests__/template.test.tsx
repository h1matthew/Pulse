/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Root Template', () => {
  beforeEach(() => {
    // Reset the module-level "intro played" flag between tests
    vi.resetModules()
  })

  it('holds content back for the watercolor splash on first load', async () => {
    const Template = (await import('../template')).default
    render(
      <Template>
        <p>Page content</p>
      </Template>
    )

    const content = screen.getByText('Page content')
    expect(content.parentElement).toHaveClass('animate-page-enter-delayed')
  })

  it('skips the splash pause on subsequent navigations', async () => {
    const Template = (await import('../template')).default
    const first = render(
      <Template>
        <p>First page</p>
      </Template>
    )
    first.unmount()

    render(
      <Template>
        <p>Second page</p>
      </Template>
    )

    const content = screen.getByText('Second page')
    expect(content.parentElement).toHaveClass('animate-page-enter')
    expect(content.parentElement).not.toHaveClass('animate-page-enter-delayed')
  })
})
