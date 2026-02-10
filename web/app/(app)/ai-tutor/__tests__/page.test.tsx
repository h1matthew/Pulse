/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AITutorPage from '../page'

// Mock the AITutorContent component
vi.mock('@/components/features/ai-tutor/AITutorContent', () => ({
  AITutorContent: () => (
    <div data-testid="ai-tutor-content">AI Tutor Content</div>
  ),
}))

describe('AI Tutor Page', () => {
  it('renders AITutorContent component', () => {
    render(<AITutorPage />)

    expect(screen.getByTestId('ai-tutor-content')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const { container } = render(<AITutorPage />)

    expect(container).toBeInTheDocument()
  })
})
