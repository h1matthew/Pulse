import Image from 'next/image'

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
  const imageSrc = founder.image_url || `/founders/${founder.id}.png`
  const zoom = founder.image_zoom || 1

  return (
    <div
      className="animate-fade-in-up group flex flex-col items-center text-center"
      style={{ animationDelay: `${0.1 + index * 0.15}s` }}
    >
      <div className="relative mb-6">
        {/* Glow ring behind image */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/20 via-chart-3/20 to-chart-2/20 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative h-44 w-44 overflow-hidden rounded-full border-2 border-border/50 bg-muted transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10">
          <Image
            src={imageSrc}
            alt={`Photo of ${founder.name}`}
            width={200}
            height={200}
            className="h-full w-full object-cover"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: `${founder.image_offset_x}% ${founder.image_offset_y}%`,
            }}
          />
        </div>
      </div>
      <h2 className="text-xl font-bold text-foreground">{founder.name}</h2>
      <p className="mt-1 text-sm font-medium text-primary">{founder.role}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {founder.bio}
      </p>
    </div>
  )
}
