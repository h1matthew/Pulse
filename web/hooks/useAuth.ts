'use client'

// Re-export useAuth from the centralized AuthProvider
// This ensures all components share the same auth state and Supabase client instance
export { useAuth } from '@/components/providers/AuthProvider'
