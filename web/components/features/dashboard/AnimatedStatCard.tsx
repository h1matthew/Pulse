'use client'

interface AnimatedStatCardProps {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  description: string
  delay?: number
}

export function AnimatedStatCard({
  icon,
  value,
  suffix = '',
  label,
  description,
  delay = 0,
}: AnimatedStatCardProps) {
  return (
    <div
      // Entrance is pure CSS: the card and its value render without JS.
      className="animate-fade-in rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-3 transition-transform duration-300 hover:scale-110">
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value}{suffix}
      </p>
      <p className="text-sm font-medium text-foreground mt-1">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
