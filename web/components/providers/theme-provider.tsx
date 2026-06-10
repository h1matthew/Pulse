'use client'

/**
 * Lightweight theme provider.
 *
 * Replaces `next-themes` to avoid React 19's "Encountered a script tag while
 * rendering React component" console error — next-themes renders its no-flash
 * `<script>` from inside a client component, which React 19 flags. Here the
 * no-flash script lives in the server-rendered <body> (see app/layout.tsx),
 * and this client provider only manages state + the `.dark` class, rendering
 * no script itself. The initial theme class is applied before hydration, so
 * there is no flash and no hydration mismatch.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

/** localStorage key — kept in sync with THEME_INIT_SCRIPT in app/layout.tsx. */
export const THEME_STORAGE_KEY = 'pulse-theme'

interface ThemeContextValue {
  theme: Theme
  /** Alias kept for API parity with next-themes consumers. */
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  // Start from the default on both server and first client render so hydration
  // markup matches; the real value is read from the DOM/storage after mount.
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  useEffect(() => {
    let initial: Theme = defaultTheme
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') {
        initial = stored
      } else if (document.documentElement.classList.contains('dark')) {
        initial = 'dark'
      }
    } catch {
      // localStorage unavailable (private mode / SSR) — keep the default.
    }
    setThemeState(initial)
    applyThemeClass(initial)
  }, [defaultTheme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyThemeClass(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Ignore storage write failures.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

const FALLBACK: ThemeContextValue = {
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
}

/**
 * Access the current theme. Returns a safe light-mode default when used
 * outside a ThemeProvider (e.g. isolated component tests) instead of throwing.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? FALLBACK
}
