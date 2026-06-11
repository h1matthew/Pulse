/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import { useHydrated } from '../useHydrated'

function Probe() {
  const hydrated = useHydrated()
  return <span data-testid="hydrated">{String(hydrated)}</span>
}

describe('useHydrated', () => {
  it('returns false during server rendering', () => {
    const html = renderToString(<Probe />)
    expect(html).toContain('false')
  })

  it('returns true on regular client renders', () => {
    render(<Probe />)
    expect(screen.getByTestId('hydrated').textContent).toBe('true')
  })
})
