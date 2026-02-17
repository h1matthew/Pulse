/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpMenu } from '../HelpMenu'

// Mock radix dialog to be testable
vi.mock('@/components/ui/dialog', () => {
  const React = require('react')
  return {
    Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (v: boolean) => void }) => (
      <div data-testid="dialog" data-open={open}>{children}</div>
    ),
    DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
      <div data-testid="dialog-trigger">{children}</div>
    ),
    DialogContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dialog-content">{children}</div>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DialogTitle: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
    DialogDescription: ({ children }: { children: React.ReactNode }) => (
      <p>{children}</p>
    ),
  }
})

describe('HelpMenu', () => {
  it('renders the help button', () => {
    render(<HelpMenu />)

    const button = screen.getByRole('button', { name: /open help menu/i })
    expect(button).toBeInTheDocument()
  })

  it('renders the help button in compact mode', () => {
    render(<HelpMenu compact />)

    const button = screen.getByRole('button', { name: /open help menu/i })
    expect(button).toBeInTheDocument()
  })

  it('renders all how-it-works steps', () => {
    render(<HelpMenu />)

    expect(screen.getByText('Discover')).toBeInTheDocument()
    expect(screen.getByText('Review & Rate')).toBeInTheDocument()
    expect(screen.getByText('Bookmark Favorites')).toBeInTheDocument()
    expect(screen.getByText('Claim Deals')).toBeInTheDocument()
    expect(screen.getByText('Complete Missions')).toBeInTheDocument()
    expect(screen.getByText('Track Your Impact')).toBeInTheDocument()
  })

  it('renders step numbers', () => {
    render(<HelpMenu />)

    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByText('Step 2')).toBeInTheDocument()
    expect(screen.getByText('Step 3')).toBeInTheDocument()
    expect(screen.getByText('Step 4')).toBeInTheDocument()
    expect(screen.getByText('Step 5')).toBeInTheDocument()
    expect(screen.getByText('Step 6')).toBeInTheDocument()
  })

  it('renders keyboard shortcuts section', () => {
    render(<HelpMenu />)

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Tab')).toBeInTheDocument()
    expect(screen.getByText('Enter')).toBeInTheDocument()
    expect(screen.getByText('Esc')).toBeInTheDocument()
  })

  it('renders AI assistant tip', () => {
    render(<HelpMenu />)

    expect(screen.getByText('Need more help?')).toBeInTheDocument()
    expect(screen.getByText(/AI Assistant/)).toBeInTheDocument()
  })

  it('renders dialog title', () => {
    render(<HelpMenu />)

    expect(screen.getByText('How Pulse Works')).toBeInTheDocument()
  })

  it('renders step descriptions', () => {
    render(<HelpMenu />)

    expect(screen.getByText(/Browse real local businesses/)).toBeInTheDocument()
    expect(screen.getByText(/Leave honest reviews/)).toBeInTheDocument()
    expect(screen.getByText(/Save businesses you love/)).toBeInTheDocument()
  })
})
