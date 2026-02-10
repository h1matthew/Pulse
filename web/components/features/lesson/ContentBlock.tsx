'use client'

import React from 'react'
import { LessonContent } from '@/types/course'
import { VideoBlock } from './VideoBlock'
import { EquationBlock } from './EquationBlock'
import { WorkedExample } from './WorkedExample'
import { PracticeProblem } from './PracticeProblem'

interface ContentBlockProps {
  block: LessonContent
}

// Memoized to prevent re-renders when parent state changes
export const ContentBlock = React.memo(function ContentBlock({ block }: ContentBlockProps) {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="text-2xl font-bold text-foreground mt-8 first:mt-0">
          {block.content}
        </h2>
      )

    case 'subheading':
      return (
        <h3 className="text-lg font-semibold text-foreground mt-6">
          {block.content}
        </h3>
      )

    case 'text':
      return (
        <p className="text-base leading-relaxed text-muted-foreground">
          {block.content}
        </p>
      )

    case 'equation':
      return <EquationBlock latex={block.content} />

    case 'callout':
      return (
        <div className="my-4 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-sm leading-relaxed text-foreground">
            {block.content}
          </p>
        </div>
      )

    case 'video':
      return <VideoBlock compositionId={block.content} />

    case 'list':
      return (
        <div className="my-2">
          {block.content && (
            <p className="text-sm font-medium text-foreground mb-2">{block.content}</p>
          )}
          <ul className="space-y-2 pl-4">
            {block.items?.map((item) => (
              <li key={`list-${item.slice(0, 50).replace(/\s+/g, '-')}`} className="text-sm leading-relaxed text-muted-foreground relative pl-4 before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/40">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )

    case 'worked-example':
      return (
        <WorkedExample
          title={block.content}
          steps={block.steps || []}
        />
      )

    case 'practice-problem':
      return (
        <PracticeProblem
          question={block.content}
          answer={block.answer || ''}
          difficulty={block.difficulty}
          revealMode={block.revealMode}
          hints={block.hints}
          inputPlaceholder={block.inputPlaceholder}
        />
      )

    case 'image':
      return (
        <figure className="my-6">
          {block.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Using <img> for dynamic external URLs from CMS content; next/image requires configured domains
            <img
              src={block.imageUrl}
              alt={block.imageAlt || block.content || 'Lesson image'}
              className="w-full rounded-lg border border-border/50"
            />
          ) : (
            <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              Image not available
            </div>
          )}
          {block.content && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">
              {block.content}
            </figcaption>
          )}
        </figure>
      )

    case 'diagram':
      return (
        <figure className="my-6">
          {block.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Using <img> for dynamic external URLs from CMS content; next/image requires configured domains
            <img
              src={block.imageUrl}
              alt={block.imageAlt || block.content || 'Diagram'}
              className="w-full max-w-2xl mx-auto rounded-lg border border-border/50 bg-white dark:bg-gray-900 p-4"
            />
          ) : (
            <div className="w-full max-w-2xl mx-auto aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border/50">
              Diagram not available
            </div>
          )}
          {block.content && (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground font-medium">
              {block.content}
            </figcaption>
          )}
        </figure>
      )

    default:
      return null
  }
})
