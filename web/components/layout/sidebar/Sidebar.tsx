import Image from 'next/image'
import { NavLink } from '@/components/ui/nav-link'
import { SidebarNav } from './SidebarNav'
import { SidebarUserSection } from './SidebarUserSection'

interface SidebarProps {
  email?: string | null
  fullName?: string | null
  isAdmin?: boolean
}

export function Sidebar({ email, fullName, isAdmin }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 h-screen flex-col border-r border-border/30 bg-background/60 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border/30 px-6">
        <NavLink href="/" className="flex items-center gap-2">
          <Image src="/pulse-mark.png" alt="Pulse" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Pulse
          </span>
        </NavLink>
      </div>

      {/* Navigation */}
      <SidebarNav isAdmin={isAdmin} />

      {/* User section */}
      <SidebarUserSection email={email} fullName={fullName} />
    </aside>
  )
}
