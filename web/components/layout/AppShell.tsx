import { Sidebar } from './sidebar/Sidebar'
import { MobileSidebar } from './sidebar/MobileSidebar'

interface AppShellProps {
  children: React.ReactNode
  email?: string | null
  fullName?: string | null
  isAdmin?: boolean
}

export function AppShell({ children, email, fullName, isAdmin }: AppShellProps) {
  return (
    <div className="relative flex min-h-screen">
      {/* AppBackground renders once in the root layout */}

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
