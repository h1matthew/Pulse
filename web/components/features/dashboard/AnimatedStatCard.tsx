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
      // Entrance is pure CSS: the card and its value render without JS, and the
      // figure is printed at its final value — never counted up.
      className="animate-fade-in rounded-lg border border-border bg-surface-1 p-5"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-surface-2 text-text-tertiary">
        {icon}
      </div>
      <p className="font-mono text-h2 font-normal tabular-nums text-foreground">
        {value}{suffix}
      </p>
      <p className="mt-1 text-small font-medium text-foreground">{label}</p>
      <p className="text-small text-muted-foreground">{description}</p>
    </div>
  )
}
