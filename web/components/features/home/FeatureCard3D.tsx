'use client'

import { BookOpen, Rocket, Brain, type LucideIcon } from 'lucide-react'

export interface FeatureData {
  id: string
  icon: 'book' | 'rocket' | 'brain'
  title: string
  description: string
}

interface FeatureCard3DProps {
  feature: FeatureData
}

const iconMap: Record<FeatureData['icon'], LucideIcon> = {
  book: BookOpen,
  rocket: Rocket,
  brain: Brain,
}

export function FeatureCard3D({ feature }: FeatureCard3DProps) {
  const Icon = iconMap[feature.icon]

  return (
    <div className="w-[280px] rounded-xl border border-border/50 bg-background/80 backdrop-blur-md p-5 shadow-lg shadow-black/20 transition-all duration-300 hover:border-primary/30">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 font-semibold text-foreground text-base">{feature.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
    </div>
  )
}

export const FEATURES: FeatureData[] = [
  {
    id: 'modules',
    icon: 'book',
    title: 'Structured Modules',
    description: '6 modules taking you from propulsion basics to building advanced multi-stage rockets.',
  },
  {
    id: 'simulations',
    icon: 'rocket',
    title: 'Visual Simulations',
    description: 'Animated visualizations of thrust, drag, orbits, and rocket assembly powered by Remotion.',
  },
  {
    id: 'tutor',
    icon: 'brain',
    title: 'AI Tutor',
    description: 'Ask questions about any concept and get clear explanations from our Gemini-powered tutor.',
  },
]
