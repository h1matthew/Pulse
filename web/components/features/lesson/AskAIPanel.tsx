'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { X, Send, GripVertical, Trash2, MessageSquare, ChevronDown, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAchievements } from '@/components/providers/AchievementProvider'
import { useAuth } from '@/hooks/useAuth'
import { InlineLatex } from '@/components/features/lesson/InlineLatex'
import { useActionGuard } from '@/hooks/useActionGuard'
import type { Conversation, ChatMessage as DBChatMessage, ExplainContext } from '@/types/chat'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
  suggestions?: string[]
}

interface AskAIPanelProps {
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  moduleId?: string
  onClose: () => void
  initialContext?: ExplainContext
}

const MIN_WIDTH = 300
const MAX_WIDTH = 600
const MIN_HEIGHT = 300
const DEFAULT_WIDTH = 384
const DEFAULT_HEIGHT = 400

export function AskAIPanel({ lessonId, lessonTitle, moduleTitle, moduleId, onClose, initialContext }: AskAIPanelProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const { checkAchievements } = useAchievements()
  const { isLoggedIn, userId } = useAuth()
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; panelX: number; panelY: number } | null>(null)
  const storageKey = `rocket-space-ai-chat-${lessonId}`
  const hasInitializedContext = useRef(false)

  // Conversation state for logged-in users
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showConversationList, setShowConversationList] = useState(false)

  const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600

  // Fetch conversations for logged-in users
  useEffect(() => {
    if (isLoggedIn && userId) {
      fetchConversations()
    }
  }, [isLoggedIn, userId, lessonId])

  async function fetchConversations() {
    try {
      const res = await fetch(`/api/ai/conversations?lessonId=${lessonId}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
        // Auto-select the most recent conversation if exists
        if (data.conversations?.length > 0 && !currentConversationId) {
          loadConversation(data.conversations[0].id)
        }
      }
    } catch (error) {
      // Fall back to localStorage on network errors - this is expected offline behavior
      console.debug('Failed to fetch conversations, falling back to localStorage:', error)
    }
  }

  async function loadConversation(conversationId: string) {
    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentConversationId(conversationId)
        setMessages(
          (data.conversation.messages || []).map((m: DBChatMessage) => ({
            role: m.role,
            content: m.content,
          }))
        )
        setShowConversationList(false)
      }
    } catch (error) {
      // Silently fail on network errors - conversation list remains available
      console.debug('Failed to load conversation:', error)
    }
  }

  const creatingConversationRef = useRef(false)

  async function createNewConversation() {
    if (!isLoggedIn) return null
    if (creatingConversationRef.current) return null
    creatingConversationRef.current = true

    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, moduleId }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentConversationId(data.conversation.id)
        setMessages([])
        await fetchConversations()
        return data.conversation.id
      }
    } catch {
      // Ignore errors
    } finally {
      creatingConversationRef.current = false
    }
    return null
  }

  const deletingRef = useRef<Set<string>>(new Set())

  async function deleteConversation(conversationId: string) {
    if (deletingRef.current.has(conversationId)) return
    deletingRef.current.add(conversationId)
    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null)
          setMessages([])
        }
        await fetchConversations()
      }
    } catch {
      // Ignore errors
    } finally {
      deletingRef.current.delete(conversationId)
    }
  }

  // Restore messages from localStorage on mount (for guests)
  useEffect(() => {
    if (!isLoggedIn) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setMessages(parsed)
          }
        }
      } catch {
        // Ignore invalid data
      }
    }
  }, [storageKey, isLoggedIn])

  // Save messages to localStorage when they change (for guests)
  useEffect(() => {
    if (!isLoggedIn && messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }, [messages, storageKey, isLoggedIn])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Initialize with context from ExplainTooltip
  useEffect(() => {
    if (initialContext && !hasInitializedContext.current) {
      hasInitializedContext.current = true
      const contextMessages: ChatMessage[] = [
        { role: 'user', content: `I want to understand: "${initialContext.selectedText}"` },
        { role: 'model', content: initialContext.explanation },
      ]
      setMessages(contextMessages)

      // For logged-in users, create a new conversation with the context
      if (isLoggedIn && !currentConversationId) {
        createNewConversationWithContext(contextMessages)
      } else if (!isLoggedIn) {
        // Save to localStorage for guests
        try {
          localStorage.setItem(storageKey, JSON.stringify(contextMessages))
        } catch {
          // Ignore storage errors
        }
      }
    }
  }, [initialContext, isLoggedIn, currentConversationId, storageKey])

  async function createNewConversationWithContext(contextMessages: ChatMessage[]) {
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, moduleId }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentConversationId(data.conversation.id)

        // Add the context messages to the conversation
        for (const msg of contextMessages) {
          await fetch(`/api/ai/conversations/${data.conversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: msg.content,
              lessonContext: `Module: ${moduleTitle}, Lesson: ${lessonTitle}`,
              skipAI: true, // Always skip AI for context messages
              role: msg.role, // Pass role explicitly so messages are saved with correct role
            }),
          })
        }

        await fetchConversations()
      }
    } catch {
      // Ignore errors
    }
  }

  async function handleClearChat() {
    if (isLoggedIn && currentConversationId) {
      await deleteConversation(currentConversationId)
    } else {
      setMessages([])
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Ignore errors
      }
    }
  }

  async function handleNewConversation() {
    if (isLoggedIn) {
      await createNewConversation()
    } else {
      setMessages([])
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // Ignore errors
      }
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current) return

    const { x: startX, y: startY, w: startW, h: startH } = resizeStartRef.current
    const deltaX = startX - e.clientX
    const deltaY = startY - e.clientY

    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + deltaX))
    const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startH + deltaY))

    setPanelWidth(newWidth)
    setPanelHeight(newHeight)
  }, [maxHeight])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    resizeStartRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleMouseMove])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: panelWidth, h: panelHeight }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'nwse-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth, panelHeight, handleMouseMove, handleMouseUp])

  // Drag handlers
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return

    const { x: startX, y: startY, panelX, panelY } = dragStartRef.current
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    const newX = Math.max(0, Math.min(window.innerWidth - panelWidth, panelX + deltaX))
    const newY = Math.max(0, Math.min(window.innerHeight - panelHeight, panelY + deltaY))

    setPanelPosition({ x: newX, y: newY })
  }, [panelWidth, panelHeight])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleDragMove])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    // Calculate current panel position
    const panel = panelRef.current
    if (panel) {
      const rect = panel.getBoundingClientRect()
      const currentX = panelPosition?.x ?? rect.left
      const currentY = panelPosition?.y ?? rect.top

      dragStartRef.current = { x: e.clientX, y: e.clientY, panelX: currentX, panelY: currentY }
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }
  }, [panelPosition, handleDragMove, handleDragEnd])

  const askingRef = useRef(false)

  async function handleAsk() {
    if (!question.trim() || askingRef.current) return
    askingRef.current = true

    const userMessage = question.trim()
    setQuestion('')
    setLoading(true)
    setStreamingContent('')

    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(updatedMessages)

    try {
      // For logged-in users, use the conversation API with streaming
      if (isLoggedIn) {
        // Create conversation if none exists
        let convId = currentConversationId
        if (!convId) {
          convId = await createNewConversation()
        }

        if (convId) {
          const res = await fetch(`/api/ai/conversations/${convId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: userMessage,
              lessonContext: `Module: ${moduleTitle}, Lesson: ${lessonTitle}`,
              stream: true,
            }),
          })

          if (!res.body) {
            throw new Error('No response body')
          }

          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let fullResponse = ''
          let suggestions: string[] = []

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value, { stream: true })
            const lines = text.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  if (parsed.chunk) {
                    // Remove suggestion tags from displayed content
                    const cleanChunk = parsed.chunk.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '')
                    fullResponse += cleanChunk
                    setStreamingContent(fullResponse)
                  }
                  if (parsed.suggestions) {
                    suggestions = parsed.suggestions
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }

          // Clean up the final response
          const cleanResponse = fullResponse.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim()
          setMessages([...updatedMessages, { role: 'model', content: cleanResponse, suggestions }])
          setStreamingContent('')
          checkAchievements()
          await fetchConversations()
          return
        }
      }

      // Fallback for guests with streaming
      const history = messages.length > 0 ? messages.map(m => ({ role: m.role, content: m.content })) : undefined

      const res = await fetch('/api/gemini/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: lessonTitle,
          lessonContext: `Module: ${moduleTitle}, Lesson: ${lessonTitle}`,
          question: userMessage,
          history,
          stream: true,
        }),
      })

      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let suggestions: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.chunk) {
                // Remove suggestion tags from displayed content
                const cleanChunk = parsed.chunk.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '')
                fullResponse += cleanChunk
                setStreamingContent(fullResponse)
              }
              if (parsed.suggestions) {
                suggestions = parsed.suggestions
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Clean up the final response
      const cleanResponse = fullResponse.replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '').trim()
      setMessages([...updatedMessages, { role: 'model', content: cleanResponse, suggestions }])
      setStreamingContent('')
      checkAchievements()
    } catch {
      setMessages([...updatedMessages, { role: 'model', content: 'Failed to connect. Please try again.' }])
      setStreamingContent('')
    } finally {
      setLoading(false)
      askingRef.current = false
    }
  }

  function handleSuggestionClick(suggestion: string) {
    setQuestion(suggestion)
  }

  return (
    <div
      ref={panelRef}
      className="fixed flex flex-col rounded-xl border border-border/50 bg-card shadow-2xl animate-scale-in z-50"
      style={{
        width: `min(${panelWidth}px, calc(100vw - 3rem))`,
        height: `${panelHeight}px`,
        ...(panelPosition
          ? { left: panelPosition.x, top: panelPosition.y }
          : { bottom: 80, right: 24 }),
      }}
    >
      {/* Resize Handle (top-left corner) */}
      <div
        onMouseDown={handleResizeStart}
        className={`absolute -top-1 -left-1 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-tl-xl ${isResizing ? 'text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
        title="Drag to resize"
      >
        <GripVertical className="h-3 w-3 rotate-[-45deg]" />
      </div>

      {/* Header with Drag Handle */}
      <div
        onMouseDown={handleDragStart}
        className={`flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-3 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="flex items-center gap-2">
          <Move className="h-3.5 w-3.5 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold text-foreground">Ask AI Tutor</h3>
          {isLoggedIn && conversations.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowConversationList(!showConversationList)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                <ChevronDown className="h-3 w-3" />
              </button>
              {showConversationList && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border/50 rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={handleNewConversation}
                    className="w-full px-3 py-2 text-left text-xs text-primary hover:bg-muted/50 transition-colors"
                  >
                    + New Conversation
                  </button>
                  <div className="border-t border-border/50 my-1" />
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors ${
                        conv.id === currentConversationId ? 'bg-muted/30' : ''
                      }`}
                    >
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="flex-1 text-left truncate text-foreground"
                      >
                        {conv.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="ml-2 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && !streamingContent ? (
          <p className="text-sm text-muted-foreground">
            Ask any question about this lesson and I&apos;ll guide you to the answer through questions.
          </p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="space-y-2">
              <div
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'ml-6 rounded-lg bg-primary/10 px-3 py-2 text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {msg.role === 'model' ? (
                  <InlineLatex>{msg.content}</InlineLatex>
                ) : (
                  msg.content
                )}
              </div>
              {/* Suggestion chips */}
              {msg.role === 'model' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {msg.suggestions.map((suggestion, j) => (
                    <button
                      key={j}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {/* Streaming content */}
        {streamingContent && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            <InlineLatex>{streamingContent}</InlineLatex>
            <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm ml-0.5 align-text-bottom" />
          </div>
        )}
        {loading && !streamingContent && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleAsk()}
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
            disabled={loading}
          />
          <Button
            onClick={handleAsk}
            disabled={!question.trim() || loading}
            size="sm"
            className="shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
