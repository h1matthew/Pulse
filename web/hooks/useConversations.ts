'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Conversation, ConversationWithMessages } from '@/types/chat'
import { fetchWithDedup } from '@/lib/fetchWithDedup'

// Query keys for cache management
// NOTE: We removed userId from the list key because:
// 1. The API already uses the authenticated user from the session
// 2. Including userId caused cache misses when auth state transitioned from null to actual ID
// 3. This prevents duplicate requests during React Strict Mode double-mounting
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
}

// Fetch all conversations for the current user
// Uses fetchWithDedup to prevent duplicate concurrent requests
async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetchWithDedup('/api/ai/conversations')
  if (!res.ok) {
    throw new Error('Failed to fetch conversations')
  }
  const data = await res.json()
  return data.conversations || []
}

// Fetch a single conversation with messages
// Uses fetchWithDedup to prevent duplicate concurrent requests
// Exported for prefetching in components
export async function fetchConversation(id: string): Promise<ConversationWithMessages> {
  const res = await fetchWithDedup(`/api/ai/conversations/${id}`)
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) {
      throw new Error('CONVERSATION_NOT_FOUND')
    }
    throw new Error('Failed to fetch conversation')
  }
  const data = await res.json()
  return data.conversation
}

// Hook to fetch all conversations with caching
// Note: userId is still required to enable the query, but removed from query key
// to prevent cache misses during auth state transitions
export function useConversations(userId: string | null) {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: fetchConversations,
    enabled: !!userId, // Only fetch when user is logged in
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

// Hook to fetch a single conversation with messages
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId!),
    queryFn: () => fetchConversation(conversationId!),
    enabled: !!conversationId,
    staleTime: 10 * 1000, // Consider fresh for 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if conversation not found
      if (error instanceof Error && error.message === 'CONVERSATION_NOT_FOUND') {
        return false
      }
      return failureCount < 2
    },
  })
}

// Hook to create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        throw new Error('Failed to create conversation')
      }
      const data = await res.json()
      return data.conversation as Conversation
    },
    onSuccess: () => {
      // Invalidate the list to refetch
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}

// Hook to delete a conversation with optimistic update
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to delete conversation')
      }
      return conversationId
    },
    onMutate: async (conversationId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() })

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData<Conversation[]>(conversationKeys.lists())

      // Optimistically update the cache
      queryClient.setQueryData<Conversation[]>(conversationKeys.lists(), (old) =>
        old?.filter(c => c.id !== conversationId) ?? []
      )

      return { previousConversations }
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationKeys.lists(), context.previousConversations)
      }
    },
    onSuccess: (deletedId) => {
      // Remove the detail cache
      queryClient.removeQueries({ queryKey: conversationKeys.detail(deletedId) })
    },
    onSettled: () => {
      // Refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}

// Hook to rename a conversation with optimistic update
export function useRenameConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) {
        throw new Error('Failed to rename conversation')
      }
      return { id, title }
    },
    onMutate: async ({ id, title }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() })

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData<Conversation[]>(conversationKeys.lists())

      // Optimistically update the cache
      queryClient.setQueryData<Conversation[]>(conversationKeys.lists(), (old) =>
        old?.map(c => c.id === id ? { ...c, title } : c) ?? []
      )

      return { previousConversations }
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationKeys.lists(), context.previousConversations)
      }
    },
    onSettled: (_, __, { id }) => {
      // Refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) })
    },
  })
}

// Hook to send a message and get response
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      lessonContext,
    }: {
      conversationId: string
      content: string
      lessonContext?: string
    }) => {
      const res = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          lessonContext: lessonContext || 'General rocket science and aerospace engineering questions',
        }),
      })
      const data = await res.json()
      return {
        answer: data.answer || "Sorry, I couldn't generate a response. Please try again.",
        rateLimit: data.rateLimit,
      }
    },
    onSuccess: (_, { conversationId }) => {
      // Invalidate both list (for updated_at) and detail (for new messages)
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) })
    },
  })
}
