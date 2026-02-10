/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import FlashcardsPage from '../page'

// Mock child components
vi.mock('@/components/features/practice/ModeSelectorStep', () => ({
  ModeSelectorStep: ({ onModeSelect }: { onModeSelect: (mode: string) => void }) => (
    <div data-testid="mode-selector-step">
      <button onClick={() => onModeSelect('learn')}>Learn</button>
    </div>
  ),
}))

vi.mock('@/components/features/practice/SessionConfigurator', () => ({
  SessionConfigurator: () => <div data-testid="session-configurator">Session Config</div>,
}))

vi.mock('@/components/features/practice/modes/FlashcardsMode', () => ({
  FlashcardsMode: () => <div data-testid="flashcards-mode">Flashcards Mode</div>,
}))

vi.mock('@/components/features/practice/modes/MatchMode', () => ({
  MatchMode: () => <div data-testid="match-mode">Match Mode</div>,
}))

vi.mock('@/components/features/practice/modes/TestMode', () => ({
  TestMode: () => <div data-testid="test-mode">Test Mode</div>,
}))

vi.mock('@/components/features/practice/modes/WriteMode', () => ({
  WriteMode: () => <div data-testid="write-mode">Write Mode</div>,
}))

vi.mock('@/lib/constants/modules', () => ({
  COURSE_MODULES: [
    {
      id: 'module-1',
      title: 'How Rockets Fly',
      lessons: [
        { id: 'lesson-1', title: 'Thrust', isQuiz: false },
        { id: 'quiz-1', title: 'Quiz', isQuiz: true },
      ],
    },
  ],
}))

vi.mock('@/lib/content/flashcards', () => ({
  FLASHCARDS: [
    { id: 'card-1', moduleId: 'module-1', front: 'Q1', back: 'A1', difficulty: 'easy' },
  ],
}))

vi.mock('@/lib/utils/flashcardUtils', () => ({
  shuffleArray: vi.fn((arr: unknown[]) => [...arr]),
}))

describe('Practice Page', () => {
  it('renders page title', () => {
    render(<FlashcardsPage />)

    expect(screen.getByText('Practice')).toBeInTheDocument()
  })

  it('renders page description', () => {
    render(<FlashcardsPage />)

    expect(screen.getByText(/Master rocket science with multiple study methods/)).toBeInTheDocument()
  })

  it('starts on mode selection step', () => {
    render(<FlashcardsPage />)

    expect(screen.getByTestId('mode-selector-step')).toBeInTheDocument()
  })

  it('renders book icon', () => {
    const { container } = render(<FlashcardsPage />)

    const svgIcons = container.querySelectorAll('svg')
    expect(svgIcons.length).toBeGreaterThan(0)
  })
})
