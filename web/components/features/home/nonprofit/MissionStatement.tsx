import { Lightbulb, GraduationCap, Rocket } from 'lucide-react'

export function MissionStatement() {
  const values = [
    {
      icon: <Lightbulb className="h-5 w-5" />,
      title: 'Accessibility',
      description: 'Free education for everyone, everywhere.',
    },
    {
      icon: <GraduationCap className="h-5 w-5" />,
      title: 'Education',
      description: 'Rigorous content built by experts.',
    },
    {
      icon: <Rocket className="h-5 w-5" />,
      title: 'Innovation',
      description: 'Interactive learning for the future.',
    },
  ]

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-lg text-muted-foreground leading-relaxed mb-8">
        Max Apogee is a California Public Benefit Corporation dedicated to making
        aerospace education accessible to students worldwide. We believe every
        curious mind deserves the opportunity to explore the wonders of rocket
        science, regardless of their background or resources.
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
