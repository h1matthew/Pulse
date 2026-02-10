import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AskAIPanel } from '../AskAIPanel'
import { AchievementProvider } from '@/components/providers/AchievementProvider'

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    loading: false,
    userId: null,
  }),
}))

// Mock scrollIntoView since jsdom doesn't implement it
Element.prototype.scrollIntoView = vi.fn()

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Helper to create a mock SSE stream response
function createMockStreamResponse(content: string, suggestions?: string[]) {
  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    start(controller) {
      // Simulate streaming chunks
      const chunks = content.split(' ')
      chunks.forEach((chunk, i) => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: chunk + (i < chunks.length - 1 ? ' ' : '') })}\n\n`))
        }
      })
      if (suggestions && !isClosed) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions })}\n\n`))
      }
      if (!isClosed) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        isClosed = true
      }
    },
  })

  return {
    ok: true,
    body: stream,
    json: async () => ({ answer: content }),
  }
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AchievementProvider userId={null}>{ui}</AchievementProvider>
  )
}

describe('AskAIPanel', () => {
  const defaultProps = {
    lessonId: 'test-lesson-1',
    lessonTitle: 'What is Thrust?',
    moduleTitle: 'How Rockets Fly',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    localStorageMock.clear()
  })

  it('renders with correct title', () => {
    renderWithProviders(<AskAIPanel {...defaultProps} />)
    expect(screen.getByText('Ask AI Tutor')).toBeInTheDocument()
  })

  it('shows initial prompt message', () => {
    renderWithProviders(<AskAIPanel {...defaultProps} />)
    expect(screen.getByText(/guide you to the answer/)).toBeInTheDocument()
  })

  it('calls onClose when X button is clicked', () => {
    renderWithProviders(<AskAIPanel {...defaultProps} />)
    // The close button is inside the header (border-b div)
    const buttons = screen.getAllByRole('button')
    const closeBtn = buttons.find(b => b.closest('.border-b'))
    expect(closeBtn).toBeDefined()
    fireEvent.click(closeBtn!)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('clears input after submission', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...createMockStreamResponse('Think about what happens when...'),
    } as Response)

    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')
    fireEvent.change(input, { target: { value: 'What is thrust?' } })
    expect(input).toHaveValue('What is thrust?')

    fireEvent.keyDown(input, { key: 'Enter' })

    // Input should be cleared immediately
    expect(input).toHaveValue('')

    await waitFor(() => {
      expect(screen.getByText('Think about what happens when...')).toBeInTheDocument()
    })
  })

  it('shows user message after submission', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...createMockStreamResponse('What do you think causes...'),
    } as Response)

    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')
    fireEvent.change(input, { target: { value: 'How does thrust work?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('How does thrust work?')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('What do you think causes...')).toBeInTheDocument()
    })
  })

  it('shows loading state while waiting for response', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('displays AI response after fetch completes', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      createMockStreamResponse('What do you already know about Newton?')
    )

    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')
    fireEvent.change(input, { target: { value: 'Tell me about thrust' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('What do you already know about Newton?')).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Failed to connect. Please try again.')).toBeInTheDocument()
    })
  })

  it('sends history with subsequent messages', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(createMockStreamResponse('What do you think?'))
      .mockResolvedValueOnce(createMockStreamResponse('Good thinking! Now consider...'))

    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')

    // First message
    fireEvent.change(input, { target: { value: 'First question' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('What do you think?')).toBeInTheDocument()
    })

    // Second message
    fireEvent.change(input, { target: { value: 'Follow up' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      const secondCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1]
      const body = JSON.parse(secondCall[1].body)
      expect(body.history).toBeDefined()
      expect(body.history).toHaveLength(2)
      expect(body.history[0].role).toBe('user')
      expect(body.history[1].role).toBe('model')
    })
  })

  it('disables input and send button while loading', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    )

    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(input).toBeDisabled()
  })

  it('does not submit empty input', () => {
    renderWithProviders(<AskAIPanel {...defaultProps} />)

    const input = screen.getByPlaceholderText('Ask a question...')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('has a resize handle element', () => {
    renderWithProviders(<AskAIPanel {...defaultProps} />)
    expect(screen.getByTitle('Drag to resize')).toBeInTheDocument()
  })
})
