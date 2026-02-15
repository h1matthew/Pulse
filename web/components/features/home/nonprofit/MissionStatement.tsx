import { MapPin, Heart, TrendingUp } from 'lucide-react'

export function MissionStatement() {
  const values = [
    {
      icon: <MapPin className="h-5 w-5" />,
      title: 'Discovery',
      description: 'Find hidden gems in your community.',
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: 'Impact',
      description: 'See how your support strengthens local economy.',
    },
    {
      icon: <Heart className="h-5 w-5" />,
      title: 'Community',
      description: 'Connect with businesses that make your neighborhood unique.',
    },
  ]

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Pulse is a local business discovery platform dedicated to strengthening
        communities by connecting people with local businesses. We believe every
        community deserves to thrive, and that starts with keeping money local
        and supporting the businesses that make our neighborhoods unique.
      </p>

      <div className="space-y-4">
        {values.map((value) => (
          <div key={value.title} className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {value.icon}
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{value.title}</h4>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
