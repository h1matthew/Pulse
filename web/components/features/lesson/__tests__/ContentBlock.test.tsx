/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ContentBlock } from '../ContentBlock'
import type { LessonContent } from '@/types/course'

// Mock child components
vi.mock('../VideoBlock', () => ({
  VideoBlock: ({ compositionId }: { compositionId: string }) => (
    <div data-testid="video-block" data-composition-id={compositionId}>
      Video Block
    </div>
  ),
}))

vi.mock('../EquationBlock', () => ({
  EquationBlock: ({ latex }: { latex: string }) => (
    <div data-testid="equation-block" data-latex={latex}>
      Equation Block
    </div>
  ),
}))

vi.mock('../WorkedExample', () => ({
  WorkedExample: ({ title, steps }: { title: string; steps: string[] }) => (
    <div data-testid="worked-example" data-title={title} data-steps={steps.length}>
      Worked Example
    </div>
  ),
}))

vi.mock('../PracticeProblem', () => ({
  PracticeProblem: ({ question, answer }: { question: string; answer: string }) => (
    <div data-testid="practice-problem" data-question={question} data-answer={answer}>
      Practice Problem
    </div>
  ),
}))

describe('ContentBlock', () => {
  it('renders heading block', () => {
    const block: LessonContent = {
      type: 'heading',
      content: 'Test Heading',
    }

    render(<ContentBlock block={block} />)

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Test Heading')
  })

  it('renders subheading block', () => {
    const block: LessonContent = {
      type: 'subheading',
      content: 'Test Subheading',
    }

    render(<ContentBlock block={block} />)

    const subheading = screen.getByRole('heading', { level: 3 })
    expect(subheading).toHaveTextContent('Test Subheading')
  })

  it('renders text block', () => {
    const block: LessonContent = {
      type: 'text',
      content: 'This is a paragraph of text content.',
    }

    render(<ContentBlock block={block} />)

    expect(screen.getByText('This is a paragraph of text content.')).toBeInTheDocument()
  })

  it('renders equation block', () => {
    const block: LessonContent = {
      type: 'equation',
      content: 'E = mc^2',
    }

    render(<ContentBlock block={block} />)

    const equationBlock = screen.getByTestId('equation-block')
    expect(equationBlock).toHaveAttribute('data-latex', 'E = mc^2')
  })

  it('renders callout block', () => {
    const block: LessonContent = {
      type: 'callout',
      content: 'This is an important note.',
    }

    render(<ContentBlock block={block} />)

    expect(screen.getByText('This is an important note.')).toBeInTheDocument()
  })

  it('renders video block', () => {
    const block: LessonContent = {
      type: 'video',
      content: 'thrust-animation',
    }

    render(<ContentBlock block={block} />)

    const videoBlock = screen.getByTestId('video-block')
    expect(videoBlock).toHaveAttribute('data-composition-id', 'thrust-animation')
  })

  it('renders list block with items', () => {
    const block: LessonContent = {
      type: 'list',
      content: 'List title:',
      items: ['Item 1', 'Item 2', 'Item 3'],
    }

    render(<ContentBlock block={block} />)

    expect(screen.getByText('List title:')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('renders list block without title', () => {
    const block: LessonContent = {
      type: 'list',
      content: '',
      items: ['Item A', 'Item B'],
    }

    render(<ContentBlock block={block} />)

    expect(screen.getByText('Item A')).toBeInTheDocument()
    expect(screen.getByText('Item B')).toBeInTheDocument()
  })

  it('renders worked-example block', () => {
    const block: LessonContent = {
      type: 'worked-example',
      content: 'Example Title',
      steps: ['Step 1', 'Step 2'],
    }

    render(<ContentBlock block={block} />)

    const workedExample = screen.getByTestId('worked-example')
    expect(workedExample).toHaveAttribute('data-title', 'Example Title')
    expect(workedExample).toHaveAttribute('data-steps', '2')
  })

  it('renders practice-problem block', () => {
    const block: LessonContent = {
      type: 'practice-problem',
      content: 'What is 2+2?',
      answer: '4',
    }

    render(<ContentBlock block={block} />)

    const practiceProblem = screen.getByTestId('practice-problem')
    expect(practiceProblem).toHaveAttribute('data-question', 'What is 2+2?')
    expect(practiceProblem).toHaveAttribute('data-answer', '4')
  })

  it('renders image block with imageUrl', () => {
    const block: LessonContent = {
      type: 'image',
      content: 'Image caption',
      imageUrl: 'https://example.com/image.png',
      imageAlt: 'Test image alt',
    }

    render(<ContentBlock block={block} />)

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/image.png')
    expect(image).toHaveAttribute('alt', 'Test image alt')
    expect(screen.getByText('Image caption')).toBeInTheDocument()
  })

  it('renders image block fallback when no imageUrl', () => {
    const block: LessonContent = {
      type: 'image',
      content: 'Image caption',
    }

    render(<ContentBlock block={block} />)

    expect(screen.getByText('Image not available')).toBeInTheDocument()
  })

  it('renders diagram block with imageUrl', () => {
    const block: LessonContent = {
      type: 'diagram',
      content: 'Diagram caption',
      imageUrl: 'https://example.com/diagram.png',
      imageAlt: 'Test diagram',
    }

    render(<ContentBlock block={block} />)

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/diagram.png')
    expect(screen.getByText('Diagram caption')).toBeInTheDocument()
  })

  it('renders diagram block fallback when no imageUrl', () => {
    const block: LessonContent = {
      type: 'diagram',
      content: '',
    }

    render(<ContentBlock block={block} />)

    expect(screen.getByText('Diagram not available')).toBeInTheDocument()
  })

  it('returns null for unknown block type', () => {
    const block = {
      type: 'unknown',
      content: 'Unknown content',
    } as unknown as LessonContent

    const { container } = render(<ContentBlock block={block} />)

    expect(container.firstChild).toBeNull()
  })
})
