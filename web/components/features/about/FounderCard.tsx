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
    <div
      className="animate-fade-in-up flex flex-col items-center text-center"
      style={{ animationDelay: `${0.1 + index * 0.15}s` }}
    >
      <h2 className="text-xl font-bold text-foreground">{founder.name}</h2>
      <p className="mt-1 text-sm font-medium text-primary">{founder.role}</p>
    </div>
  )
}
