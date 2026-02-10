'use client'

import { useMemo } from 'react'
import katex from 'katex'

interface InlineLatexProps {
  children: string
  className?: string
}

interface TextPart {
  type: 'text' | 'inline-latex' | 'display-latex'
  content: string
}

function parseLatex(text: string): TextPart[] {
  const parts: TextPart[] = []
  // Match $$...$$ (display) first, then $...$ (inline)
  // Using a single regex that captures both patterns
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    const matched = match[0]
    if (matched.startsWith('$$')) {
      // Display mode: $$...$$
      parts.push({
        type: 'display-latex',
        content: matched.slice(2, -2).trim(),
      })
    } else {
      // Inline mode: $...$
      parts.push({
        type: 'inline-latex',
        content: matched.slice(1, -1).trim(),
      })
    }

    lastIndex = regex.lastIndex
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return parts
}

function renderLatex(latex: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
      maxSize: 500,
      maxExpand: 1000,
    })
  } catch {
    return null
  }
}

export function InlineLatex({ children, className }: InlineLatexProps) {
  const parts = useMemo(() => parseLatex(children), [children])

  const rendered = useMemo(() => {
    return parts.map((part, index) => {
      if (part.type === 'text') {
        return <span key={index}>{part.content}</span>
      }

      const isDisplay = part.type === 'display-latex'
      const html = renderLatex(part.content, isDisplay)

      if (!html) {
        // Fallback: show raw LaTeX in code style
        return (
          <code
            key={index}
            className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
          >
            {part.content}
          </code>
        )
      }

      if (isDisplay) {
        return (
          <span
            key={index}
            className="my-2 block text-center overflow-x-auto scrollbar-none [&_.katex-display]:my-0 [&_.katex-display]:overflow-visible [&_.katex]:text-inherit"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      }

      return (
        <span
          key={index}
          className="mx-0.5 inline-block align-middle scrollbar-none [&_.katex]:text-[0.95em] [&_.katex]:text-inherit"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    })
  }, [parts])

  return <span className={className}>{rendered}</span>
}
