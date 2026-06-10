import { Header } from '@/components/layout/Header'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      {/* AppBackground renders once in the root layout */}
      <Header />
      {/* Spacer for fixed header */}
      <div className="h-24" />
      {children}
    </div>
  )
}
