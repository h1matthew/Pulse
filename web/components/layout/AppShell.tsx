import { Sidebar } from './sidebar/Sidebar'
import { MobileSidebar } from './sidebar/MobileSidebar'
import { AppBackground } from './AppBackground'

interface AppShellProps {
  children: React.ReactNode
  email?: string | null
  fullName?: string | null
  isAdmin?: boolean
}

export function AppShell({ children, email, fullName, isAdmin }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen">
      {/* Animated background */}
      <AppBackground />

      {/* Desktop sidebar */}
      <Sidebar email={email} fullName={fullName} isAdmin={isAdmin} />

      {/* Mobile sidebar + header */}
      <MobileSidebar email={email} fullName={fullName} isAdmin={isAdmin} />

      {/* Main content */}
      <main className="flex-1 overflow-auto md:h-screen">
        {children}
      </main>
    </div>
  )
}
