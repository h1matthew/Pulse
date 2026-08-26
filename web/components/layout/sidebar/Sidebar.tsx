import { NavLink } from '@/components/ui/nav-link'
import { PulseLogo } from '@/components/ui/PulseLogo'
import { SidebarNav } from './SidebarNav'
import { SidebarUserSection } from './SidebarUserSection'

interface SidebarProps {
  email?: string | null
  fullName?: string | null
  isAdmin?: boolean
}

export function Sidebar({ email, fullName, isAdmin }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 h-screen flex-col border-r border-border/30 bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border/30 px-6">
        <NavLink href="/" className="flex items-center gap-2">
          <PulseLogo className="h-10 w-10 text-foreground" />
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
