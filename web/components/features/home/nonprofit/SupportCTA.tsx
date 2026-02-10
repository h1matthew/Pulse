'use client'

import { Users, ArrowRight } from 'lucide-react'
import { NavLink } from '@/components/ui/nav-link'
import { TiltCard } from '../TiltCard'

export function SupportCTA() {
  return (
    <div className="flex justify-center">
      <TiltCard maxTilt={3} glare={false} className="w-full max-w-md">
        <NavLink href="/volunteer" className="block">
          <div className="group relative flex flex-col items-center rounded-xl border border-border/50 bg-card p-8 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Volunteer With Us
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Share your expertise and help create content for future rocket scientists.
            </p>
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-primary transition-all">
              Learn More
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </NavLink>
      </TiltCard>
    </div>
  )
}
