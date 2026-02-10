/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'
import { FlashcardDeck } from '../FlashcardDeck'
import type { Flashcard } from '@/types/flashcards'

const mockCards: Flashcard[] = [
  {
    id: 'card-1',
    front: 'What is thrust?',
    back: 'The force that propels a rocket forward',
    moduleId: 'module-1',
    difficulty: 'easy',
    hint: 'Think about Newton\'s Third Law',
  },
  {
    id: 'card-2',
    front: 'What is drag?',
    back: 'The force that opposes motion through a fluid',
    moduleId: 'module-1',
    difficulty: 'medium',
  },
  {
    id: 'card-3',
    front: 'What is delta-v?',
    back: 'Change in velocity required for a maneuver',
    moduleId: 'module-1',
    difficulty: 'hard',
  },
]

describe('FlashcardDeck', () => {
  const mockOnRate = vi.fn()
  const mockOnMarkKnown = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.alert and window.confirm
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('renders first card', () => {
    render(<FlashcardDeck cards={mockCards} />)

    expect(screen.getByText('What is thrust?')).toBeInTheDocument()
  })

  it('shows progress counter', () => {
    render(<FlashcardDeck cards={mockCards} />)

    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument()
  })

  it('shows QUESTION label on front', () => {
    render(<FlashcardDeck cards={mockCards} />)

    expect(screen.getByText('QUESTION')).toBeInTheDocument()
  })

  it('flips card to show answer on click', () => {
    render(<FlashcardDeck cards={mockCards} />)

    const card = screen.getByText('What is thrust?').closest('[class*="cursor-pointer"]')
    fireEvent.click(card!)

    expect(screen.getByText('ANSWER')).toBeInTheDocument()
    expect(screen.getByText('The force that propels a rocket forward')).toBeInTheDocument()
  })

  it('shows hint button when card has hint', () => {
    render(<FlashcardDeck cards={mockCards} />)

    expect(screen.getByText('Show Hint')).toBeInTheDocument()
  })

  it('shows hint when hint button clicked', () => {
    render(<FlashcardDeck cards={mockCards} />)

    fireEvent.click(screen.getByText('Show Hint'))

    expect(screen.getByText(/Think about Newton's Third Law/)).toBeInTheDocument()
  })

  it('hides hint button for cards without hint', () => {
    render(<FlashcardDeck cards={[mockCards[1]]} />)

    expect(screen.queryByText('Show Hint')).not.toBeInTheDocument()
  })

  it('shows rating buttons when card is flipped', () => {
    render(<FlashcardDeck cards={mockCards} onRate={mockOnRate} />)

    // Flip the card
    const card = screen.getByText('What is thrust?').closest('[class*="cursor-pointer"]')
    fireEvent.click(card!)

    expect(screen.getByText('Again')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
  })

  it('calls onRate with correct rating', () => {
    render(<FlashcardDeck cards={mockCards} onRate={mockOnRate} />)

    // Flip and rate
    const card = screen.getByText('What is thrust?').closest('[class*="cursor-pointer"]')
    fireEvent.click(card!)
    fireEvent.click(screen.getByText('Good'))

    expect(mockOnRate).toHaveBeenCalledWith('card-1', 'good')
  })

  it('navigates to next card', () => {
    render(<FlashcardDeck cards={mockCards} />)

    fireEvent.click(screen.getByText('Next'))

    expect(screen.getByText('What is drag?')).toBeInTheDocument()
    expect(screen.getByText('Card 2 of 3')).toBeInTheDocument()
  })

  it('navigates to previous card', () => {
    render(<FlashcardDeck cards={mockCards} />)

    // Go to second card
    fireEvent.click(screen.getByText('Next'))
    // Go back
    fireEvent.click(screen.getByText('Previous'))

    expect(screen.getByText('What is thrust?')).toBeInTheDocument()
    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument()
  })

  it('disables Previous on first card', () => {
    render(<FlashcardDeck cards={mockCards} />)

    const prevButton = screen.getByText('Previous').closest('button')
    expect(prevButton).toBeDisabled()
  })

  it('disables Next on last card', () => {
    render(<FlashcardDeck cards={mockCards} />)

    // Go to last card
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))

    const nextButton = screen.getByText('Next').closest('button')
    expect(nextButton).toBeDisabled()
  })

  it('resets flip state when navigating', () => {
    render(<FlashcardDeck cards={mockCards} />)

    // Flip first card
    const card = screen.getByText('What is thrust?').closest('[class*="cursor-pointer"]')
    fireEvent.click(card!)

    // Navigate to next
    fireEvent.click(screen.getByText('Next'))

    // Should show front of second card
    expect(screen.getByText('QUESTION')).toBeInTheDocument()
    expect(screen.getByText('What is drag?')).toBeInTheDocument()
  })

  it('tracks reviewed cards count', () => {
    vi.useFakeTimers()
    render(<FlashcardDeck cards={mockCards} onRate={mockOnRate} />)

    // Rate first card
    const card = screen.getByText('What is thrust?').closest('[class*="cursor-pointer"]')
    fireEvent.click(card!)
    fireEvent.click(screen.getByText('Good'))

    // Check reviewed count increases
    expect(screen.getByText('1 reviewed')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('shows message when no cards available', () => {
    render(<FlashcardDeck cards={[]} />)

    expect(screen.getByText('No flashcards available.')).toBeInTheDocument()
  })

  it('shows Mark as Known button when onMarkKnown provided', () => {
    render(<FlashcardDeck cards={mockCards} onMarkKnown={mockOnMarkKnown} />)

    expect(screen.getByText('I already know this')).toBeInTheDocument()
  })

  it('does not call onMarkKnown when not confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<FlashcardDeck cards={mockCards} onMarkKnown={mockOnMarkKnown} />)

    fireEvent.click(screen.getByText('I already know this'))

    expect(mockOnMarkKnown).not.toHaveBeenCalled()
  })

  it('shows Study Again button after completion', () => {
    vi.useFakeTimers()
    render(<FlashcardDeck cards={[mockCards[0]]} onRate={mockOnRate} />)

    // Flip and rate the only card
    const card = screen.getByText('What is thrust?').closest('[class*="cursor-pointer"]')
    fireEvent.click(card!)
    fireEvent.click(screen.getByText('Good'))

    // Wait for completion screen
    expect(screen.getByText('Session Complete!')).toBeInTheDocument()
    expect(screen.getByText('Study Again')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('handles restart after completion', () => {
    vi.useFakeTimers()
    render(<FlashcardDeck cards={[mockCards[0]]} onRate={mockOnRate} />)

    // Complete the deck (single card)
    const card = screen.getByText('What is thrust?').closest('[class*="cursor-pointer"]')
    fireEvent.click(card!)
    fireEvent.click(screen.getByText('Good'))

    // Click Study Again
    fireEvent.click(screen.getByText('Study Again'))

    // Should restart
    expect(screen.getByText('What is thrust?')).toBeInTheDocument()
    expect(screen.getByText('Card 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('0 reviewed')).toBeInTheDocument()

    vi.useRealTimers()
  })
})
