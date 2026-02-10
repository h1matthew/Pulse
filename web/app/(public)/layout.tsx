import { Header } from '@/components/layout/Header'
import { AppBackground } from '@/components/layout/AppBackground'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <Header />
      {/* Spacer for fixed header */}
      <div className="h-24" />
      {children}
    </div>
  )
}
