'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, Brain, Rocket, Plus, Trash2, Edit2, Check, X, MessageSquare, ChevronDown, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
  conversationKeys,
} from '@/hooks/useConversations'
import { ChatLoadingSkeleton } from './AITutorLoadingSkeleton'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Conversation } from '@/types/chat'

interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

interface AITutorContentProps {
  initialConversationId?: string | null
  onNotFound?: () => void
}

const SUGGESTED_QUESTIONS = [
  'How does rocket thrust work?',
  'What is orbital velocity?',
  'Why do rockets have stages?',
  'How does gravity affect rockets?',
]

// Format remaining time until rate limit resets
function formatTimeRemaining(resetTimestamp: number, now = Date.now()): string {
  const diffMs = Math.max(0, resetTimestamp - now)
  const seconds = Math.ceil(diffMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes}m`
}

export function AITutorContent({ initialConversationId = null, onNotFound }: AITutorContentProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isLoggedIn, userId, loading: authLoading } = useAuth()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Conversation management with React Query
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // React Query hooks for cached data fetching
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations(userId)
  const { data: conversationData, isLoading: conversationLoading, error: conversationError } = useConversation(currentConversationId)
  const createConversationMutation = useCreateConversation()
  const deleteConversationMutation = useDeleteConversation()
  const renameConversationMutation = useRenameConversation()

  // Rate limit tracking
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)
  const [rateLimitTotal, setRateLimitTotal] = useState<number | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [rateLimitNow, setRateLimitNow] = useState(() => Date.now())

  // Debug: expose rate limit state to window
  useEffect(() => {
    (window as unknown as { __rateLimit: unknown }).__rateLimit = { rateLimitRemaining, rateLimitTotal, rateLimitReset }
    console.log('[DEBUG] Rate limit state:', { rateLimitRemaining, rateLimitTotal, rateLimitReset })
  }, [rateLimitRemaining, rateLimitTotal, rateLimitReset])

  useEffect(() => {
    if (!rateLimitReset) return
    let active = true
    const tick = () => {
      if (!active) return
      setRateLimitNow(Date.now())
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [rateLimitReset])

  useEffect(() => {
    if (!rateLimitReset || rateLimitTotal === null) return
    if (rateLimitNow >= rateLimitReset) {
      setRateLimitRemaining(rateLimitTotal)
      setRateLimitReset(null)
    }
  }, [rateLimitNow, rateLimitReset, rateLimitTotal])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync messages from React Query conversation data
  useEffect(() => {
    if (conversationData?.messages) {
      setMessages(
        conversationData.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      )
    }
  }, [conversationData])

  // Handle conversation not found errors
  useEffect(() => {
    if (conversationError instanceof Error && conversationError.message === 'CONVERSATION_NOT_FOUND') {
      if (onNotFound) {
        onNotFound()
      } else {
        router.replace('/ai-tutor')
      }
    }
  }, [conversationError, onNotFound, router])

  // Load conversation function - now just updates state, React Query handles fetching
  function loadConversation(conversationId: string) {
    setCurrentConversationId(conversationId)
    // Update URL without causing a re-render/remount
    window.history.replaceState(null, '', `/ai-tutor/${conversationId}`)
  }

  function createNewConversation() {
    // Clear current state for new conversation
    setCurrentConversationId(null)
    setMessages([])
    router.push('/ai-tutor')
  }

  async function deleteConversation(conversationId: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (deleteConversationMutation.isPending) return

    try {
      await deleteConversationMutation.mutateAsync(conversationId)
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setMessages([])
        router.push('/ai-tutor')
      }
    } catch {
      // Ignore errors - React Query handles it
    }
  }

  async function renameConversation(conversationId: string) {
    if (!editingTitle.trim()) {
      setEditingConversationId(null)
      return
    }
    if (renameConversationMutation.isPending) return

    try {
      await renameConversationMutation.mutateAsync({ id: conversationId, title: editingTitle })
    } catch {
      // Ignore errors - React Query handles it
    }
    setEditingConversationId(null)
  }

  function startRename(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setEditingConversationId(conv.id)
    setEditingTitle(conv.title)
  }

  const askingRef = useRef(false)

  async function handleAsk(input?: string) {
    const userMessage = (input || question).trim()
    if (!userMessage || askingRef.current) return
    askingRef.current = true

    setQuestion('')
    setLoading(true)

    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(updatedMessages)

    try {
      // For logged-in users, use the conversation API
      if (isLoggedIn) {
        let convId = currentConversationId

        // Create conversation if none exists
        if (!convId) {
          try {
            const newConv = await createConversationMutation.mutateAsync()
            convId = newConv.id
            setCurrentConversationId(convId)
            // Update URL to new conversation (use replaceState to avoid remount)
            window.history.replaceState(null, '', `/ai-tutor/${convId}`)
          } catch {
            // Failed to create conversation, fall through to guest mode
          }
        }

        if (convId) {
          const res = await fetch(`/api/ai/conversations/${convId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: userMessage,
              lessonContext: 'General rocket science and aerospace engineering questions',
            }),
          })

          const data = await res.json()

          // Extract rate limit info from response body
          if (data.rateLimit) {
            setRateLimitRemaining(data.rateLimit.remaining)
            setRateLimitTotal(data.rateLimit.limit)
            setRateLimitReset(data.rateLimit.reset)
          }

          const aiResponse = data.answer || 'Sorry, I couldn\'t generate a response. Please try again.'
          setMessages([...updatedMessages, { role: 'model', content: aiResponse }])
          // Invalidate conversations list to update titles and timestamps
          queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
          return
        }
      }

      // Fallback for guests
      const history = messages.length > 0 ? messages : undefined

      const res = await fetch('/api/gemini/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: 'Rocket Science',
          lessonContext: 'General rocket science and aerospace engineering questions',
          question: userMessage,
          history,
        }),
      })

      const data = await res.json()

      // Extract rate limit info from response body
      if (data.rateLimit) {
        setRateLimitRemaining(data.rateLimit.remaining)
        setRateLimitTotal(data.rateLimit.limit)
        setRateLimitReset(data.rateLimit.reset)
      }

      const aiResponse = data.answer || 'Sorry, I couldn\'t generate a response. Please try again.'
      setMessages([...updatedMessages, { role: 'model', content: aiResponse }])
    } catch {
      setMessages([...updatedMessages, { role: 'model', content: 'Failed to connect. Please try again.' }])
    } finally {
      setLoading(false)
      askingRef.current = false
      // Refocus input after sending message
      inputRef.current?.focus()
    }
  }

  const currentConversation = conversations.find(c => c.id === currentConversationId)

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)] md:max-h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">AI Tutor</h1>
              <p className="text-xs text-muted-foreground">
                {isLoggedIn ? 'Conversations saved automatically' : 'Ask anything about rocket science'}
              </p>
            </div>
          </div>

          {/* Conversation controls for logged-in users */}
          {isLoggedIn && (
            <div className="flex items-center gap-2">
              <Button
                onClick={createNewConversation}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[120px] truncate">
                      {currentConversation?.title || 'History'}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
                  {conversationsLoading ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No conversations yet
                    </div>
                  ) : (
                    <>
                      {conversations.map((conv) => (
                        <DropdownMenuItem
                          key={conv.id}
                          className={`flex items-center gap-2 cursor-pointer ${
                            conv.id === currentConversationId ? 'bg-primary/10' : ''
                          }`}
                          onSelect={() => loadConversation(conv.id)}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {editingConversationId === conv.id ? (
                            <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  e.stopPropagation()
                                  if (e.key === 'Enter') renameConversation(conv.id)
                                  if (e.key === 'Escape') setEditingConversationId(null)
                                }}
                                className="flex-1 text-sm bg-background border border-border/50 rounded px-2 py-1"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  renameConversation(conv.id)
                                }}
                                className="text-green-500 hover:text-green-600 p-1"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setEditingConversationId(null)
                                }}
                                className="text-red-500 hover:text-red-600 p-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm truncate">{conv.title}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100">
                                <button
                                  onClick={(e) => startRename(conv, e)}
                                  className="text-muted-foreground hover:text-foreground p-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => deleteConversation(conv.id, e)}
                                  className="text-muted-foreground hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-muted-foreground cursor-pointer"
                        onSelect={createNewConversation}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Start new conversation
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {conversationLoading ? (
            <ChatLoadingSkeleton />
          ) : messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Welcome to the AI Tutor</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                I can help you understand rocket science concepts, explain equations, and guide you through complex topics.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    className="rounded-full border border-border/50 bg-card px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'ml-12 rounded-xl bg-primary/10 px-4 py-3 text-foreground'
                    : 'mr-12 rounded-xl bg-muted/50 px-4 py-3 text-foreground'
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleAsk()}
              placeholder="Ask a question about rocket science..."
              className="flex-1 rounded-lg border border-border/50 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              disabled={loading}
            />
            <Button
              onClick={() => handleAsk()}
              disabled={!question.trim() || loading}
              size="lg"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {rateLimitRemaining !== null && (
            <div className="flex justify-end">
              <span className={cn(
                "text-xs",
                rateLimitRemaining <= 3 ? "text-destructive" : "text-muted-foreground"
              )}>
                {rateLimitRemaining} message{rateLimitRemaining !== 1 ? 's' : ''} remaining
                {rateLimitReset && rateLimitTotal !== null && rateLimitRemaining < rateLimitTotal && (
                  <> · Resets in {formatTimeRemaining(rateLimitReset, rateLimitNow)}</>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
