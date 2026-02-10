'use client'

import { useState } from 'react'
import { Menu, X, Users, Heart, LayoutDashboard, Handshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavLink } from '@/components/ui/nav-link'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useAuth } from '@/components/providers/AuthProvider'

const NAV_ITEMS_PUBLIC = [
  { href: '/about', label: 'About', icon: Users },
  { href: '/mission', label: 'Our Mission', icon: Heart },
  { href: '/get-involved', label: 'Get Involved', icon: Handshake },
]

const NAV_ITEMS_LOGGED_IN = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/about', label: 'About', icon: Users },
  { href: '/mission', label: 'Our Mission', icon: Heart },
  { href: '/get-involved', label: 'Get Involved', icon: Handshake },
]

export function MobileMenu() {
  const { isLoggedIn } = useAuth()
  const [open, setOpen] = useState(false)
  const navItems = isLoggedIn ? NAV_ITEMS_LOGGED_IN : NAV_ITEMS_PUBLIC

  return (
    <>
      {/* Menu button - only visible on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Mobile menu dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="fixed inset-y-0 right-0 left-auto top-0 h-full w-full max-w-xs translate-x-0 translate-y-0 rounded-none border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:hidden"
          showCloseButton={false}
        >
          <VisuallyHidden>
            <DialogTitle>Navigation Menu</DialogTitle>
          </VisuallyHidden>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Max Apogee" className="h-8 w-8" />
              <span className="font-semibold">Max Apogee</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>

          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-border/50">
              <div className="space-y-2 py-6">
                {navItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="-mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="py-6">
                {isLoggedIn ? (
                  <form action="/auth/signout" method="post" className="-mx-3">
                    <button
                      type="submit"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                    >
                      Sign out
                    </button>
                  </form>
                ) : (
                  <NavLink
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                  >
                    Sign in
                  </NavLink>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
