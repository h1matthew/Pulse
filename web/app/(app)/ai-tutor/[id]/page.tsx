'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AITutorContent } from '@/components/features/ai-tutor/AITutorContent'
import { AITutorLoadingSkeleton } from '@/components/features/ai-tutor/AITutorLoadingSkeleton'

export default function AITutorConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { isLoggedIn, loading } = useAuth()
  const router = useRouter()
  const [notFound, setNotFound] = useState(false)

  // Redirect guests to main page
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace('/ai-tutor')
    }
  }, [isLoggedIn, loading, router])

  if (loading) {
    return <AITutorLoadingSkeleton />
  }

  if (!isLoggedIn) return null

  if (notFound) {
    return <AITutorContent onNotFound={() => router.replace('/ai-tutor')} />
  }

  return (
    <AITutorContent
      initialConversationId={id}
      onNotFound={() => setNotFound(true)}
    />
  )
}
