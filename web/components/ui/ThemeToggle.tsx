'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  compact?: boolean
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={mounted ? `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      className={cn(
        "flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground",
        compact ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-md"
      )}
    >
      {mounted && resolvedTheme === 'dark' ? (
        <Sun className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      ) : (
        <Moon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      )}
    </button>
  )
}
