'use client'

import { usePathname } from 'next/navigation'
import { LogOut, Shield, Users, LayoutDashboard, Store, MapPin, Tag, Zap, Bot } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { NavLink } from '@/components/ui/nav-link'
import { PulseLogo } from '@/components/ui/PulseLogo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { SignOutButton } from './SignOutButton'
import { HelpMenu } from '@/components/features/help/HelpMenu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'

const NAV_ITEMS_PUBLIC = [
  { href: '/discover', label: 'Discover', icon: Store },
  { href: '/categories', label: 'Categories', icon: MapPin },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/about', label: 'About', icon: Users },
]

const NAV_ITEMS_LOGGED_IN = [
  { href: '/discover', label: 'Discover', icon: Store },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/missions', label: 'Missions', icon: Zap },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/assistant', label: 'Assistant', icon: Bot },
]

export function Header() {
  const { isLoggedIn, isAdmin } = useAuth()
  const pathname = usePathname()

  const navItems = isLoggedIn ? NAV_ITEMS_LOGGED_IN : NAV_ITEMS_PUBLIC

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-5 px-7">
        {/* Logo */}
        <NavLink
          href="/"
          aria-label="Pulse — Home"
          className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
        >
          <PulseLogo className="h-6 w-6 text-foreground" />
          <span className="text-[15px] font-semibold tracking-tight">Pulse</span>
        </NavLink>

        {/* Center nav — bordered pill container */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-0.5 rounded-[11px] border border-border bg-card p-1 sm:flex"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-[7px] rounded-lg px-[13px] py-[7px] text-[13.5px] transition-all',
                  isActive
                    ? 'bg-muted font-semibold text-foreground shadow-sm'
                    : 'font-medium text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle
            compact
            className="h-9 w-9 rounded-[9px] border border-border bg-card text-foreground hover:bg-muted"
          />
          {isAdmin && (
            <NavLink
              href="/admin"
              aria-label="Admin panel"
              className={cn(
                'hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[13.5px] font-semibold transition-colors sm:inline-flex',
                pathname.startsWith('/admin')
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>Admin</span>
            </NavLink>
          )}
          {/* Help sits directly beside the auth action */}
          <div className="hidden sm:block">
            <HelpMenu />
          </div>
          {isLoggedIn ? (
            <SignOutButton>
              <button
                type="button"
                aria-label="Sign out"
                className="hidden h-9 items-center gap-[7px] rounded-[9px] border border-border bg-card px-3.5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex"
              >
                <LogOut className="h-[15px] w-[15px]" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </SignOutButton>
          ) : (
            <NavLink
              href="/login"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'hidden h-9 rounded-[9px] px-3.5 text-[13.5px] font-semibold sm:inline-flex'
              )}
            >
              Sign in
            </NavLink>
          )}

          <MobileMenu />
        </div>
      </div>
    </header>
  )
}
