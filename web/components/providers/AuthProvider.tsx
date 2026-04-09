'use client'

import { createContext, useContext, useState, useEffect, type ReactNode, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  isLoggedIn: boolean
  isAdmin: boolean
  loading: boolean
  userId: string | null
  user: User | null
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isAdmin: false,
  loading: true,
  userId: null,
  user: null,
})

interface AuthProviderProps {
  children: ReactNode
}

// Singleton Supabase client to prevent multiple instances
let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Fetch profile (or create one if missing) to get isAdmin status
    async function fetchProfile(userId: string, email?: string, fullName?: string) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (profile) {
        setIsAdmin(profile.is_admin ?? false)
        return
      }

      // Profile doesn't exist — create it (new user or missing migration)
      await supabase.from('profiles').upsert({
        id: userId,
        email: email || '',
        full_name: fullName || '',
        is_admin: false,
      }, { onConflict: 'id' })
      setIsAdmin(false)
    }

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchProfile(user.id, user.email, user.user_metadata?.full_name).finally(() => setLoading(false))
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      if (newUser) {
        fetchProfile(newUser.id, newUser.email, newUser.user_metadata?.full_name)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      isLoggedIn: !!user,
      isAdmin,
      loading,
      userId: user?.id ?? null,
      user,
    }),
    [user, isAdmin, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
