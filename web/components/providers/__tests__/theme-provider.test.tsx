/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import {
  ThemeProvider,
  useTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '../theme-provider'

function Probe() {
  const { resolvedTheme, setTheme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>set-dark</button>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  )
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('ThemeProvider', () => {
  it('renders children and exposes the default theme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('renders no <script> element (avoids the React 19 script warning)', () => {
    const { container } = render(
      <ThemeProvider>
        <div>content</div>
      </ThemeProvider>
    )
    expect(container.querySelector('script')).toBeNull()
  })

  it('reads a persisted theme from localStorage on mount and applies the class', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    render(
      <ThemeProvider defaultTheme="light">
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme updates state, toggles the dark class, and persists', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    )
    act(() => {
      screen.getByText('set-dark').click()
    })
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('toggleTheme flips between light and dark', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Probe />
      </ThemeProvider>
    )
    act(() => screen.getByText('toggle').click())
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    act(() => screen.getByText('toggle').click())
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('useTheme returns a safe light default outside a provider', () => {
    render(<Probe />)
    expect(screen.getByTestId('theme').textContent).toBe('light')
    // Clicking does not throw even without a provider
    act(() => screen.getByText('toggle').click())
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('ignores invalid stored values and keeps the default', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'rainbow' as Theme)
    render(
      <ThemeProvider defaultTheme="light">
        <Probe />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })
})
