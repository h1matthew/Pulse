'use client'

import { useCallback, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { cn } from '@/lib/utils'

export interface NavLinkProps {
  href: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  /** Show a spinner icon while navigating */
  showSpinner?: boolean
  /** Extra click handler (e.g. close a mobile menu) */
  onClick?: () => void
}

export function NavLink({ href, children, className, style, showSpinner, onClick }: NavLinkProps) {
  const { isNavigating, navigate } = useNavigation()

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      onClick?.()
      navigate(href)
    },
    [href, navigate, onClick],
  )

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(className, isNavigating && 'pointer-events-none opacity-60')}
      style={style}
      suppressHydrationWarning={true}
      aria-disabled={isNavigating || undefined}
    >
      {children}
      {showSpinner && isNavigating && (
        <Loader2 className="h-4 w-4 animate-spin ml-1" />
      )}
    </Link>
  )
}
