'use client'

import { useCallback, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Wraps Next.js router.push in a transition so that concurrent
 * navigations are impossible — calls while `isNavigating` is true are ignored.
 */
export function useNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isNavigating, startTransition] = useTransition()

  const navigate = useCallback(
    (href: string) => {
      if (isNavigating) return
      // Skip navigation if already on the target page
      if (href === pathname) return
      startTransition(() => {
        router.push(href)
      })
    },
    [isNavigating, pathname, router, startTransition],
  )

  return { isNavigating, navigate }
}
