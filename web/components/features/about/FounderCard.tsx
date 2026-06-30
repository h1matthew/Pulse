export interface Founder {
  id: string
  name: string
  role: string
  bio: string
  image_url: string | null
  image_offset_x: number
  image_offset_y: number
  image_zoom: number
  display_order: number
}

interface FounderCardProps {
  founder: Founder
  index: number
}

export function FounderCard({ founder, index }: FounderCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/30">
      <p
        className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, '0')}
      </p>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{founder.name}</h2>
      <p className="mt-1 text-sm font-medium text-primary">{founder.role}</p>
    </div>
  )
}
