'use client'

import { usePathname } from 'next/navigation'
import { LogOut, Shield } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { NavLink } from '@/components/ui/nav-link'
import { PulseLogo } from '@/components/ui/PulseLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { SignOutButton } from './SignOutButton'
import { HelpMenu } from '@/components/features/help/HelpMenu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'

const NAV_ITEMS_PUBLIC = [
  { href: '/discover', label: 'Discover' },
  { href: '/categories', label: 'Categories' },
  { href: '/deals', label: 'Deals' },
  { href: '/about', label: 'About' },
]

const NAV_ITEMS_LOGGED_IN = [
  { href: '/discover', label: 'Discover' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/missions', label: 'Missions' },
  { href: '/deals', label: 'Deals' },
  { href: '/about', label: 'About' },
]

export function Header() {
  const { isLoggedIn, isAdmin } = useAuth()
  const pathname = usePathname()

  // Get nav items based on login state
  const navItems = isLoggedIn ? NAV_ITEMS_LOGGED_IN : NAV_ITEMS_PUBLIC

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-14 max-w-content items-center gap-8 bg-background px-4 sm:px-6"
      >
        {/* Wordmark */}
        <NavLink
          href="/"
          aria-label="Pulse — Home"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <PulseLogo className="h-7 w-7 text-primary" />
          <span className="text-body font-medium">Pulse</span>
        </NavLink>

        {/* Inline nav */}
        <div className="hidden items-center gap-6 sm:flex">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <NavLink
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'text-small transition-colors',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </div>

        {/* Controls */}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <ThemeToggle />
          {isAdmin && (
            <NavLink
              href="/admin"
              aria-label="Admin panel"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-small transition-colors',
                pathname.startsWith('/admin')
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">Admin</span>
            </NavLink>
          )}
          {/* Help sits directly beside the auth action */}
          <HelpMenu />
          {isLoggedIn ? (
            <SignOutButton>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Sign out"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">Sign out</span>
              </Button>
            </SignOutButton>
          ) : (
            <NavLink href="/login" className={cn(buttonVariants({ size: 'sm' }), 'px-4')}>
              Sign in
            </NavLink>
          )}
        </div>

        {/* Mobile menu */}
        <div className="ml-auto sm:hidden">
          <MobileMenu />
        </div>
      </nav>
    </header>
  )
}
