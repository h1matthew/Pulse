'use client'

import { useMemo, useState } from 'react'
import katex from 'katex'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EquationBlockProps {
  latex: string
  label?: string
}

export function EquationBlock({ latex, label }: EquationBlockProps) {
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        strict: false,
        maxSize: 500,
        maxExpand: 1000,
      })
    } catch {
      return null
    }
  }, [latex])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(latex)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  if (!html) {
    return (
      <div className="my-4 rounded-xl bg-destructive/10 border border-destructive/20 px-6 py-4 text-center">
        <code className="text-sm font-mono text-destructive">
          Error rendering: {latex}
        </code>
      </div>
    )
  }

  return (
    <div className="group relative my-6">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl',
          'bg-gradient-to-br from-muted/80 via-muted/50 to-muted/30',
          'border border-border/60',
          'shadow-sm',
          'dark:from-card/80 dark:via-card/50 dark:to-card/30',
          'dark:border-border/40 dark:shadow-lg dark:shadow-primary/5'
        )}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Content area */}
        <div className="flex items-center justify-center px-8 py-6">
          {/* Label */}
          {label && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground/70">
              {label}
            </div>
          )}

          {/* Equation */}
          <div
            className={cn(
              'text-lg text-foreground overflow-x-auto max-w-full',
              '[&_.katex]:text-foreground',
              '[&_.katex-display]:my-0',
              '[&_.katex-display]:overflow-visible',
              '[&_.katex-display]:scrollbar-none',
              '[&_.katex-display]:py-1',
              '[&_.katex]:font-normal',
              'scrollbar-none'
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Copy button */}
          <button
            onClick={copyToClipboard}
            className={cn(
              'absolute right-3 top-3',
              'flex h-7 w-7 items-center justify-center rounded-md',
              'text-muted-foreground/50 hover:text-muted-foreground',
              'bg-background/50 hover:bg-background/80',
              'border border-border/50',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
              'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
            title="Copy LaTeX"
            aria-label="Copy LaTeX to clipboard"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Bottom accent line */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
    </div>
  )
}
