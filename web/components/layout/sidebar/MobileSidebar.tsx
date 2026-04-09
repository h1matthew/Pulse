'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { PulseLogo } from '@/components/ui/PulseLogo'
import { NavLink } from '@/components/ui/nav-link'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { SidebarNav } from './SidebarNav'
import { SidebarUserSection } from './SidebarUserSection'

interface MobileSidebarProps {
  email?: string | null
  fullName?: string | null
  isAdmin?: boolean
}

export function MobileSidebar({ email, fullName, isAdmin }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile header bar */}
      <header className="md:hidden flex h-14 items-center justify-between border-b border-border/30 bg-background/60 backdrop-blur-xl px-4">
        <NavLink href="/" className="flex items-center gap-2">
          <PulseLogo className="h-8 w-8 text-foreground" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Pulse
          </span>
        </NavLink>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </header>

      {/* Sheet drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-background/80 backdrop-blur-xl border-r border-border/30"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>

          {/* Logo header */}
          <div className="flex h-14 items-center gap-2 border-b border-border/30 px-6">
            <NavLink href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <PulseLogo className="h-8 w-8 text-foreground" />
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Pulse
              </span>
            </NavLink>
          </div>

          {/* Navigation */}
          <div className="flex flex-col h-[calc(100%-3.5rem)] overflow-hidden">
            <SidebarNav onItemClick={() => setOpen(false)} isAdmin={isAdmin} />
            <SidebarUserSection email={email} fullName={fullName} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
